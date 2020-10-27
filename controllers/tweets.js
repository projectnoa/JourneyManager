// tweets.js

/**
 * Required External Modules
 */

var fetch = require('node-fetch');

var dateFormat = require('dateformat');

var Tweet = require('./../models/tweet');

const s3 = require('./../helpers/s3');
const xml = require('./../helpers/xml');

/**
 * Variables 
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/rss.ajourneyforwisdom.com/rss/tweetbotFeed.xml';
const resourceKey = 'tweetbotFeed.xml';

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
  tweet = { 
    id: [dateFormat(date, "yyyymmddhhmmss")], 
    date: [dateFormat(date, "yyyy-mm-dd")], 
    description: [req.body.text] 
  };
  
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
  })
  .then(response => response.text())
  .then(data => {
    xml.parseData(data, callback);
  });
}

var parseTweets = (result) => {
  return result.rss.channel[0].item.map(item => new Tweet(item));
}

var addTweet = (tweet, callback) => {
  // Get live data
  getTweets(result => {
    // Append item
    result.rss.channel[0].item.push(tweet);
    // Submit to S3
    s3.submitS3File({
      Bucket: process.env.AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result)
    }, callback);
  });
}

var removeTweet = (id, callback) => {
  // Get live tweets data
  getTweets(result => {
    // Remove tweet
    let items = result.rss.channel[0].item;
    result.rss.channel[0].item = items.filter(item => item.id[0] !== id);
    // Submit to S3
    s3.submitS3File({
      Bucket: process.env.AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result)
    }, callback);
  });
}