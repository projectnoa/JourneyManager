// podcasts.js

/**
 * Required External Modules
 */

const AWS = require('aws-sdk');

var fetch = require('node-fetch');
var parseString = require("xml2js").parseString;
var xml2js = require("xml2js");

var Podcast = require('./../models/podcast');

/**
 * Variables
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/rss.ajourneyforwisdom.com/rss/podcast.xml';

/**
 *  Methods
 */

exports.podcastsIndex = (req, res, next) => {
    getPodcast(result => {
        res.render('./podcasts/index', { title: 'Podcasts', authorized: true, items: parsePodcast(result) }); 
    });
};

exports.podcastsShow = (req, res, next) => {
    res.render('./../views/podcasts/show', { title: '', authorized: true });
};

exports.podcastsNew = (req, res, next) => {
    res.render('./../views/podcasts/new', { title: 'New Podcast', authorized: true });
};

exports.podcastsCreate = (req, res, next) => {
    
};

var getPodcast = (callback) => {
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

var parsePodcast = (result) => {
    return result.rss.channel[0].item.map(item => new Podcast(item));
}