// tweets.js

/**
 * Required External Modules
 */

var dateFormat = require('dateformat');

var Tweet = require('./../models/tweet');

const fetcher = require('./../helpers/fetcher');

const winston = require('./../helpers/winston');

const helpers = require('./../helpers/helper');
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

exports.tweetsIndex = async (req, res) => {
  let page = req.query.page;

  if (page == undefined) page = 1;

  try {
    // Get live feed
    winston.info(' -- Getting live feed.');
    let result = await fetcher(feedURL);

    // Parse posts
    winston.info(' -- Parsing items.');
    let items = parseTweets(result);

    let total = items.length;
    let pages = Math.ceil(total / 5);

    items = items.slice((page - 1) * 5, page * 5);

    // Render page
    winston.info(' -- Rendering page.');
    res.render('./tweets/index', { 
      title: 'Tweets', 
      authorized: true, 
      items: items, 
      entity: 'tweets',
      page: parseInt(page), 
      total: total, 
      pages: pages
    });
  } catch (err) {
      // Log error message
      winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      helpers.setNotice(res, `An error occured: ${err.message}`);
      // Return error 
      res.redirect('back', 500, { title: 'Tweets', authorized: true });
  }
};

exports.tweetsNew = (req, res) => {
    res.render('./../views/tweets/new', { title: 'New Tweet', authorized: true });
};

exports.tweetsCreate = async (req, res) => {
    try {
      // Get live feed
      winston.info(' -- Getting live feed.');
      let result = await fetcher(feedURL);

      // Initialize if empty
      if (result.rss.channel[0].item == undefined) result.rss.channel[0].item = [];

      // Create post
      winston.info(' -- Creating post');
      // Initiate tweet
      let date = new Date();
      tweet = { 
        id: [dateFormat(date, "yyyymmddHHMMss")], 
        date: [dateFormat(date, "yyyy-mm-dd")], 
        description: [helpers.sanitize(req.body.text)] 
      };

      // Append item
      winston.info(' -- Appending item.');
      result.rss.channel[0].item.push(tweet);

      // Publish feed update
      winston.info(' -- Publishing feed updates.');
      let succeeded = await s3.submitS3File({
        Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
        Key: resourceKey,
        Body: xml.jsonToXML(result),
        ACL: 'public-read'
      });

      // Respond to response
      if (helpers.isDefined(succeeded)) {
        // Set notice
        helpers.setNotice(res, 'Tweet saved!');
        // Respond
        winston.info(' -- Success.');
        res.redirect('/tweets');
      } else {
        // Set notice
        helpers.setNotice(res, 'There was an error creating the tweet.');
        // Return error 
        winston.warn(' -- FAILURE.');
        res.redirect('back', 500, { title: 'New Tweet', authorized: true });
      }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error 
        res.redirect('back', 500, { title: 'New Tweet', authorized: true });
    }
};

exports.tweetsDestroy = async (req, res) => {
  // Get removed tweet id
  var id = req.params.id;

  try {
    // Get live feed
    winston.info(' -- Getting live feed.');
    let result = await fetcher(feedURL);

    // Delete tweet
    winston.info(' -- Deleting tweet.');
    let items = result.rss.channel[0].item;
    result.rss.channel[0].item = items.filter(item => item.id[0] !== id);

    // Publish feed update
    winston.info(' -- Publishing feed updates.');
    let succeeded = await s3.submitS3File({
      Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: xml.jsonToXML(result),
      ACL: 'public-read'
    });

    // Check status 
    if (helpers.isDefined(succeeded)) {
      // Set notice
      helpers.setNotice(res, 'Tweet deleted.');
      // Respond
      winston.info(' -- Success.');
      res.redirect('/tweets');
    } else {
      // Set notice
      helpers.setNotice(res, 'There was an error deleting the tweet.');
      // Return error 
      winston.warn(' -- FAILURE.');
      res.redirect('back', 500, { title: 'New Tweet', authorized: true });
    }
  } catch (err) {
      // Log error message
      winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      helpers.setNotice(res, `An error occured: ${err.message}`);
      // Return error 
      res.redirect('back', 500, { title: 'New Tweet', authorized: true });
  }
};

var parseTweets = (result) => {
  return result.rss.channel[0].item != undefined ? result.rss.channel[0].item.map(item => new Tweet(item)).reverse() : [];
}