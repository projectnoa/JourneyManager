// tweets.js

/**
 * Required External Modules
 */

const AWS = require('aws-sdk');
var parseString = require("xml2js").parseString;

/**
 * Variables 
 */

var s3 = new AWS.S3({ accessKeyId: process.env.AWS_S3_ID, secretAccessKey: process.env.AWS_S3_SECRET });

/**
 *  Methods
 */

exports.tweetsIndex = (req, res, next) => {
    var params = {
      Bucket: process.env.AWS_S3_BUCKET, 
      Key: "tweetbotFeed.xml"
     };
    
    s3.getObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      
      var dataString = data.Body.toString('utf-8');
      parseString(dataString, function(err, result) {
        if (err) console.log(err);
  
        res.render('./../views/tweets/index', { title: 'Tweets', authorized: true, items: result.rss.channel[0].item });
      });
    });
};

exports.tweetsNew = (req, res, next) => {
    res.render('./../views/tweets/new', { title: 'New Tweet', authorized: true });
};

exports.tweetsCreate = (req, res, next) => {

};

exports.tweetsEdit = (req, res, next) => {

};

exports.tweetsUpdate = (req, res, next) => {

};

exports.tweetsDestroy = (req, res, next) => {

};