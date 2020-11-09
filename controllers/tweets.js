// tweets.js

/**
 * Required External Modules
 */

var dateFormat = require('dateformat');

var Tweet = require('./../models/tweet');

const helpers = require('./../helpers/helper');
const fetcher = require('./../helpers/fetcher');
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

exports.tweetsIndex = async (req, res, next) => {
    try {
      let result = await fetcher(feedURL);

      res.render('./tweets/index', { title: 'Tweets', authorized: true, items: parseTweets(result) });
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.send({ message: err.message });
    }
};

exports.tweetsNew = (req, res, next) => {
    res.render('./../views/tweets/new', { title: 'New Tweet', authorized: true });
};

exports.tweetsCreate = async (req, res, next) => {
  // Initiate tweet
  let date = new Date();
  tweet = { 
    id: [dateFormat(date, "yyyymmddhhmmss")], 
    date: [dateFormat(date, "yyyy-mm-dd")], 
    description: [helpers.sanitize(req.body.text)] 
  };
  // Save tweet
  try {
    let result = await fetcher(feedURL);

    if (result.rss.channel[0].item == undefined) result.rss.channel[0].item = [];

    // Append item
    result.rss.channel[0].item.push(tweet);
    // Submit to S3
    let succeeded = await s3.submitS3File({
      Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result)
    });
    // Check status 
    if (succeeded) {
      res.redirect('/tweets');
    } else {
      res.redirect('back', { title: 'New Tweet', authorized: true, notice: 'There was an error.' });
    }
  } catch (err) {
      // Log error message
      console.log(err);
      // Return error 
      res.send({ message: err.message });
  }
};

exports.tweetsDestroy = async (req, res, next) => {
  // Get removed tweet id
  var id = req.params.id;
  // Remove tweet
  try {
    let result = await fetcher(feedURL);
    // Remove tweet
    let items = result.rss.channel[0].item;
    result.rss.channel[0].item = items.filter(item => item.id[0] !== id);
    // Submit to S3
    let succeeded = await s3.submitS3File({
      Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result)
    });
    // Check status 
    if (succeeded) {
      res.redirect('/tweets');
    } else {
      res.redirect('back', { title: 'New Tweet', authorized: true, notice: 'There was an error.' });
    }
  } catch (err) {
      // Log error message
      console.log(err);
      // Return error 
      res.send({ message: err.message });
  }
};

var parseTweets = (result) => {
  return result.rss.channel[0].item != undefined ? result.rss.channel[0].item.map(item => new Tweet(item)).reverse() : [];
}