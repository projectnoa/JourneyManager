// tweets.js

/**
 * Required External Modules
 */

import dateFormat from 'dateformat';

import Tweet from './../models/tweet.js';

import fetcher from './../helpers/fetcher.js';

import { info, error, warn } from './../helpers/winston.js';

import { setNotice, sanitize, isDefined } from './../helpers/helper.js';
import { submitS3File } from './../helpers/s3.js';
import { jsonToXML } from './../helpers/xml.js';

/**
 * Variables 
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/rss.ajourneyforwisdom.com/rss/tweetbotFeed.xml';
const resourceKey = 'tweetbotFeed.xml';

let feed_cache = null;

/**
 *  Methods
 */

export async function tweetsIndex(req, res) {
  let page = req.query.page;

  if (page == undefined) page = 1;

  try {
    // Get live feed
    info(' -- Getting live feed.');
    let result = await retrieve_feed(refresh_cookie(req));

    // Parse posts
    info(' -- Parsing items.');
    let items = parseTweets(result);

    let total = items.length;
    let pages = Math.ceil(total / 5);

    items = items.slice((page - 1) * 5, page * 5);

    // Render page
    info(' -- Rendering page.');
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
      error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      setNotice(res, `An error occured: ${err.message}`);
      // Return error 
      res.redirect('back', 500, { title: 'Tweets', authorized: true });
  }
}

export function tweetsNew(req, res) {
    res.render('./../views/tweets/new', { title: 'New Tweet', authorized: true });
}

export async function tweetsCreate(req, res) {
    try {
      // Get live feed
      info(' -- Getting live feed.');
      let result = await retrieve_feed(true);

      // Initialize if empty
      if (result.rss.channel.item == undefined) result.rss.channel.item = [];

      // Create tweet
      info(' -- Creating tweet');
      // Initiate tweet
      let date = new Date();
      let tweet = { 
        id: [dateFormat(date, "yyyymmddHHMMss")], 
        date: [dateFormat(date, "yyyy-mm-dd")], 
        description: [sanitize(req.body.text)] 
      };

      // Append item
      info(' -- Appending item.');
      result.rss.channel.item.push(tweet);

      // Publish feed update
      info(' -- Publishing feed updates.');
      let succeeded = await submitS3File({
        Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
        Key: resourceKey,
        Body: jsonToXML(result),
        ACL: 'public-read'
      });

      // Respond to response
      if (isDefined(succeeded)) {
        // Set notice
        setNotice(res, 'Tweet saved!');
        // Respond
        info(' -- Success.');
        
        res.redirect('/tweets');
      } else {
        // Set notice
        setNotice(res, 'There was an error creating the tweet.');
        // Return error 
        warn(' -- FAILURE.');

        res.redirect('back', 500, { title: 'New Tweet', authorized: true });
      }
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error 
        res.redirect('back', 500, { title: 'New Tweet', authorized: true });
    }
}

export async function tweetsEdit(req, res) {
  let id = req.body.id;

  try {
    // Get live feed
    info(' -- Getting live feed.');
    let result = await retrieve_feed(refresh_cookie(req));

    // Parse posts
    info(' -- Parsing items.');
    let items = parseTweets(result);

    // Render page
    info(' -- Rendering page.');
    res.render('./tweets/edit', {
        title: 'Edit tweet',
        authorized: true,
        item: items.find(i => i.id == id),
        entity: 'tweet'
    });
  } catch (err) {
      // Log error message
      error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      setNotice(res, `An error occured: ${err.message}`);
      // Return error
      res.redirect('back', 500, { title: 'Edit tweet', authorized: true });
  }
}

export async function tweetsUpdate(req, res) {
  try {
    // Get live feed
    info(' -- Getting live feed.');
    let result = await retrieve_feed(true);

    // Update feed item
    info(' -- Updating feed item.');
    let updated_items = 
        result.rss.channel.item.map((item) => {
            if (new Tweet(item).id == req.body.id) {
                item['description'] = sanitize(req.body.text);
            }

            return item;
        });

    result.rss.channel.item = updated_items;

    // Publish feed update
    info(' -- Publishing feed updates.');
    let succeeded = await submitS3File({
      Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: jsonToXML(result),
      ACL: 'public-read'
    });

    // Respond to response
    if (isDefined(succeeded)) {
      // Set notice
      setNotice(res, 'Tweet updated!');
      // Respond
      info(' -- Success.');
      res.redirect('/tweets');
    } else {
      // Set notice
      setNotice(res, 'There was an error updating the tweet.');
      // Return error 
      warn(' -- FAILURE.');
      res.redirect('back', 500, { title: 'Edit Tweet', authorized: true });
    }
  } catch (err) {
      // Log error message
      error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      setNotice(res, `An error occured: ${err.message}`);
      // Return error 
      res.redirect('back', 500, { title: 'Edit Tweet', authorized: true });
  }
}

export async function tweetsDestroy(req, res) {
  // Get removed tweet id
  let id = req.params.id;

  try {
    // Get live feed
    info(' -- Getting live feed.');
    let result = await retrieve_feed(true);

    // Delete tweet
    info(' -- Deleting tweet.');
    let items = result.rss.channel.item;
    result.rss.channel.item = items.filter(item => item.id !== id);

    // Publish feed update
    info(' -- Publishing feed updates.');
    let succeeded = await submitS3File({
      Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
      Key: resourceKey,
      Body: jsonToXML(result),
      ACL: 'public-read'
    });

    // Check status 
    if (isDefined(succeeded)) {
      // Set notice
      setNotice(res, 'Tweet deleted.');
      // Respond
      info(' -- Success.');
      res.redirect('/tweets');
    } else {
      // Set notice
      setNotice(res, 'There was an error deleting the tweet.');
      // Return error 
      warn(' -- FAILURE.');
      res.redirect('back', 500, { title: 'New Tweet', authorized: true });
    }
  } catch (err) {
      // Log error message
      error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      setNotice(res, `An error occured: ${err.message}`);
      // Return error 
      res.redirect('back', 500, { title: 'New Tweet', authorized: true });
  }
}

let parseTweets = (result) => {
  return result.rss.channel.item != undefined ? result.rss.channel.item.map(item => new Tweet(item)).reverse() : [];
}

let refresh_cookie = (req) => {
  return req.cookies['_JourneyManager_fresh'] === 'true';
}

let retrieve_feed = async (fresh=false) => {
  // If fresh feed requested or no cache
  if (fresh == 'true' || fresh === true || !isDefined(feed_cache)) {
      // Get live feed
      info(' -- Getting live feed.');
      feed_cache = await fetcher(feedURL);
  }
  // Return feed data 
  return feed_cache;
}