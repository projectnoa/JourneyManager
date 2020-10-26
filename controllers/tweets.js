// tweets.js

/**
 * Required External Modules
 */

const AWS = require('aws-sdk');

var fetch = require('node-fetch');
var parseString = require("xml2js").parseString;
var xml2js = require("xml2js");

var dateFormat = require('dateformat');

var Tweet = require('./../models/tweet');

/**
 * Variables 
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/rss.ajourneyforwisdom.com/rss/tweetbotFeed.xml';

var s3 = new AWS.S3({ 
  accessKeyId: process.env.AWS_S3_ID, 
  secretAccessKey: process.env.AWS_S3_SEC 
});

/**
 *  Methods
 */

exports.tweetsIndex = (req, res, next) => {
    getTweets(result => {
      res.render('./../views/tweets/index', { title: 'Tweets', authorized: true, items: parseTweets(result) });
    });
};

exports.tweetsNew = (req, res, next) => {
    res.render('./../views/tweets/new', { title: 'New Tweet', authorized: true });
};

exports.tweetsCreate = (req, res, next) => {
  let date = new Date();
  tweet = { id: [dateFormat(date, "yyyymmddhhmmss")], date: [dateFormat(date, "yyyy-mm-dd")], description: [req.body.text] };
  
  addTweet(tweet, (succeeded) => {
    if (succeeded) {
      res.redirect('/tweets');
    } else {
      res.redirect('back', { title: 'New Tweet', authorized: true, notice: 'There was an error.' });
    }
  });
};

exports.tweetsEdit = (req, res, next) => {

};

exports.tweetsUpdate = (req, res, next) => {

};

exports.tweetsDestroy = (req, res, next) => {
  // Get removed tweet id
  var id = req.params.id;
  // Remove tweet
  removeTweet(id, (succeeded) => {
    if (succeeded) {
      res.redirect('/tweets');
    } else {
      res.redirect('back', { title: 'New Tweet', authorized: true, notice: 'There was an error.' });
    }
  });
};

var getTweets = (callback) => {
  var req = fetch(feedURL, { 
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36', 
    'accept': 'text/html,application/xhtml+xml' 
  }).then(response => response.text())
  .then(data => {
      parseString(data, function(err, result) {
          if (err) console.log(err);
    
          callback(result);
      });
  });
}

var parseTweets = (result) => {
  return result.rss.channel[0].item.map(item => new Tweet(item));
}

var addTweet = (tweet, callback) => {
  // Get live tweets data
  getTweets(result => {
    // Append tweet
    result.rss.channel[0].item.push(tweet);
    // Convert to XML
    var builder = new xml2js.Builder();
    var data = builder.buildObject(result);
    // Submit to S3
    submitTweets(data, callback);
  });
}

var removeTweet = (id, callback) => {
  // Get live tweets data
  getTweets(result => {
    // Take items
    let items = result.rss.channel[0].item;
    // Remove tweet
    result.rss.channel[0].item = items.filter(item => item.id[0] !== id);
    // Convert to XML
    var builder = new xml2js.Builder();
    var data = builder.buildObject(result);
    // Submit to S3
    submitTweets(data, callback);
  });
}

var submitTweets = (data, callback) => {
  var params = {
    Bucket: process.env.AWS_S3_BUCKET, 
    Key: "tweetbotFeed.xml",
    Body: data
   };
  
  s3.upload(params, function(err, data) {
    if (err) { 
      console.log(err, err.stack);
      // Failed
      callback(false);
    } else {
      // Succeeded
      callback(true);
    }
  });
}