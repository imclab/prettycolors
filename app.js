var express = require('express');
var ejs     = require('ejs');
var mysql   = require('mysql');
var tumblr  = require('./lib/tumblr.js');
var emitter = require('./lib/emitter');
var stream  = require('./lib/stream');

var app = express();

stream.start();

function get_client_ip(req) {
    var ip_address = false;

    // Amazon EC2 / Heroku workaround to get real client IP
    if (req.header('x-forwarded-for')) {
        // 'x-forwarded-for' header may return multiple IP addresses in the format:
        // "client IP, proxy 1 IP, proxy 2 IP" so take the the first one
        ip_address = req.header('x-forwarded-for').split(',')[0];
    }

    if (! ip_address) {
        ip_address = req.connection.remoteAddress;
    }

    return ip_address;
}

var tumblr_client = tumblr.createClient({
    consumer_key: process.env.TUMBLR_API_CONSUMER_KEY,
    consumer_secret: process.env.TUMBLR_API_CONSUMER_SECRET,
    token: process.env.TUMBLR_API_TOKEN,
    token_secret: process.env.TUMBLR_API_TOKEN_SECRET
});

app.configure(function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
});

app.set('view engine', 'ejs');
app.set('view options', {
    layout: false
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.get('/stream', function(req, res){
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');

    var stream_name = new Date().getTime();

    stream.register(stream_name, res);

    req.on('close', function() {
        console.log('Unregistering stream %j via close', stream_name);
        stream.unregister(stream_name);
    });

    req.on('timeout', function() {
        console.log('Unregistering stream %j via timeout', stream_name);
        stream.unregister(stream_name);
    });

});

app.get('/history', function(req, res){
    var mysql_connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL);

    mysql_connection.query('SELECT hex FROM colors ORDER BY submitted_on DESC', function(err, data){
        if (err) console.log(err);
        console.log(data.length);

        mysql_connection.destroy();

        var hexes = [];

        for (var i=0; i < data.length; i++) {
            hexes.push('#' + data[i].hex);
        }

        res.render('history', {
            hexes: JSON.stringify(hexes),
        });
    });

});

app.post('/submit', function(req, res){
    emitter.emit('color', req.body.hex);

    tumblr_client.photo('prettycolors', {
        state: 'queue',
        tags: 'prettycolors',
        data64: req.body.base64,
        caption: req.body.hex,
    }, function(err, data){
        if (err) console.log(err);
        console.log(data);

        var mysql_params = {
            hex: req.body.hex.replace('#', ''),
            submitted_ip: get_client_ip(req),
        };

        var mysql_connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL);

        mysql_connection.query('INSERT INTO colors SET ?', mysql_params, function(err, data){
            if (err) console.log(err);
            console.log(data);

            mysql_connection.destroy();

            res.redirect('http://prettycolors.tumblr.com/');
            res.end();
        });
    });
});

app.get('/*', function(req, res){
    res.redirect('http://prettycolors.tumblr.com/');
    res.end();
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log('Listening on port ' + port);
});
