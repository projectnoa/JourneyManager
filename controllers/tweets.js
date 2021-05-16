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

var feed_cache = null;

/**
 *  Methods
 */

exports.tweetsIndex = async (req, res) => {
  let page = req.query.page;

  if (page == undefined) page = 1;

  try {
    // Get live feed
    winston.info(' -- Getting live feed.');
    let result = await retrieve_feed(refresh_cookie(req));

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
      let result = await retrieve_feed(true);

      // Initialize if empty
      if (result.rss.channel.item == undefined) result.rss.channel.item = [];

      // Create tweet
      winston.info(' -- Creating tweet');
      // Initiate tweet
      let date = new Date();
      tweet = { 
        id: [dateFormat(date, "yyyymmddHHMMss")], 
        date: [dateFormat(date, "yyyy-mm-dd")], 
        description: [helpers.sanitize(req.body.text)] 
      };

      // Append item
      winston.info(' -- Appending item.');
      result.rss.channel.item.push(tweet);

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

exports.tweetsEdit = async (req, res) => {
  let id = req.body.id;

  try {
    // Get live feed
    winston.info(' -- Getting live feed.');
    let result = await retrieve_feed(refresh_cookie(req));

    // Parse posts
    winston.info(' -- Parsing items.');
    let items = parseTweets(result);

    // Render page
    winston.info(' -- Rendering page.');
    res.render('./tweets/edit', {
        title: 'Edit tweet',
        authorized: true,
        item: items.find(i => i.id == id),
        entity: 'tweet'
    });
  } catch (err) {
      // Log error message
      winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      helpers.setNotice(res, `An error occured: ${err.message}`);
      // Return error
      res.redirect('back', 500, { title: 'Edit tweet', authorized: true });
  }
};

exports.tweetsUpdate = async (req, res) => {
  try {
    // Get live feed
    winston.info(' -- Getting live feed.');
    let result = await retrieve_feed(true);

    // Update feed item
    winston.info(' -- Updating feed item.');
    let updated_items = 
        result.rss.channel.item.map((item) => {
            if (new Tweet(item).id == req.body.id) {
                // item['id'] = helpers.sanitize(req.body.id);
                // item['date'] = helpers.sanitize(req.body.date);
                item['description'] = helpers.sanitize(req.body.text);
            }

            return item;
        });

    result.rss.channel.item = updated_items;

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
      helpers.setNotice(res, 'Tweet updated!');
      // Respond
      winston.info(' -- Success.');
      res.redirect('/tweets');
    } else {
      // Set notice
      helpers.setNotice(res, 'There was an error updating the tweet.');
      // Return error 
      winston.warn(' -- FAILURE.');
      res.redirect('back', 500, { title: 'Edit Tweet', authorized: true });
    }
  } catch (err) {
      // Log error message
      winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      helpers.setNotice(res, `An error occured: ${err.message}`);
      // Return error 
      res.redirect('back', 500, { title: 'Edit Tweet', authorized: true });
  }
};

exports.tweetsDestroy = async (req, res) => {
  // Get removed tweet id
  var id = req.params.id;

  try {
    // Get live feed
    winston.info(' -- Getting live feed.');
    let result = await retrieve_feed(true);

    // Delete tweet
    winston.info(' -- Deleting tweet.');
    let items = result.rss.channel.item;
    result.rss.channel.item = items.filter(item => item.id !== id);

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
  return result.rss.channel.item != undefined ? result.rss.channel.item.map(item => new Tweet(item)).reverse() : [];
}

var refresh_cookie = (req) => {
  return req.cookies['_JourneyManager_fresh'] === 'true';
}

var retrieve_feed = async (fresh=false) => {
  // If fresh feed requested or no cache
  if (fresh === 'true' || fresh === true || !helpers.isDefined(feed_cache)) {
      // Get live feed
      winston.info(' -- Getting live feed.');
      feed_cache = await fetcher(feedURL);
  }
  // Return feed data 
  return feed_cache;
}