var express = require('express');
var tumblr = require('tumblr.js');
var OAuth = require('oauth').OAuth;

var app = express();

// var client = tumblr.createClient({
//     consumer_key: process.env.TUMBLR_API_CONSUMER_KEY,
//     consumer_secret: process.env.TUMBLR_API_CONSUMER_SECRET,
//     token: process.env.TUMBLR_API_TOKEN,
//     token_secret: process.env.TUMBLR_API_TOKEN_SECRET
// });

app.configure(function(){
    app.use(express.bodyParser());
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.get('/request_token', function(req, res) {    
    var getRequestTokenUrl = "http://www.tumblr.com/oauth/request_token";
    
    var oa = new OAuth(getRequestTokenUrl,
        "http://www.tumblr.com/oauth/access_token",
        process.env.TUMBLR_API_CONSUMER_KEY,
        process.env.TUMBLR_API_CONSUMER_SECRET,
        "1.0",
        "http://pretty-colors.herokuapp.com/callback",
        "HMAC-SHA1"
    );

    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if(error) {
            console.log('error');
            console.log(error);
        } else {
            console.log('oauth_token: ' + oauth_token);
            console.log('oauth_token_secret: ' + oauth_token_secret);
            res.redirect("http://www.tumblr.com/oauth/authorize?oauth_token=" + oauth_token);
        }
    });
});

app.get('/callback', function(res, req){
    if (error) {
        console.log('error');
        console.log(error);
    } else {
        console.log('oauth_access_token: ' + oauth_access_token);
        console.log('oauth_access_token_secret: ' + oauth_access_token_secret);
    }

    res.send(';');
});

app.post('/submit', function(req, res){
    console.log(req.body);

    res.redirect('http://prettycolors.tumblr.com/');
    res.end();
});

app.get('/*', function(req, res){
    res.redirect('http://prettycolors.tumblr.com/');
    res.end();
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log('Listening on port ' + port);
});