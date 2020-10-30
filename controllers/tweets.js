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
    getTweets()
    .then(data => {
      res.render('./../views/tweets/index', { title: 'Tweets', authorized: true, items: parseTweets(data) });
    })
    .catch((err) => {
      // Log error message
      console.log(err);
      // Return error 
      res.send({ message: err });
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
  
  addTweet(tweet)
  .then(succeeded => {
    if (succeeded) {
      res.redirect('/tweets');
    } else {
      res.redirect('back', { title: 'New Tweet', authorized: true, notice: 'There was an error.' });
    }
  })
  .catch((err) => {
    // Log error message
    console.log(err);
    // Return error 
    res.send({ message: err });
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
  removeTweet(id)
  .then(succeeded => {
    if (succeeded) {
      res.redirect('/tweets');
    } else {
      res.redirect('back', { title: 'New Tweet', authorized: true, notice: 'There was an error.' });
    }
  })
  .catch((err) => {
    // Log error message
    console.log(err);
    // Return error 
    res.send({ message: err });
  });
};

var getTweets = () => {
  return fetch(feedURL, { 
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36', 
    'accept': 'text/html,application/xhtml+xml' 
  })
  .then(response => response.text())
  .then(xml.parseData);
}

var parseTweets = (result) => {
  return result.rss.channel[0].item.map(item => new Tweet(item));
}

var addTweet = (tweet) => {
  // Get live data
  return getTweets()
  .then(result => {
    // Append item
    result.rss.channel[0].item.push(tweet);
    // Submit to S3
    return s3.submitS3File({
      Bucket: process.env.AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result)
    });
  });
}

var removeTweet = (id) => {
  // Get live tweets data
  return getTweets()
  .then(result => {
    // Remove tweet
    let items = result.rss.channel[0].item;
    result.rss.channel[0].item = items.filter(item => item.id[0] !== id);
    // Submit to S3
    return s3.submitS3File({
      Bucket: process.env.AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result)
    });
  });
}