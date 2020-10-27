// s3.js

/**
 * Required External Modules
 */

const AWS = require('aws-sdk');

AWS.config.update({region: 'us-west-2'});

/**
 * Variables
 */

var s3 = new AWS.S3({ 
    accessKeyId: process.env.AWS_S3_ID, 
    secretAccessKey: process.env.AWS_S3_SEC 
});

/**
 *  Methods
 */

exports.submitS3File = (params, callback) => {
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

exports.createS3File = (data, key, bucket) => {
    return {
        Bucket: bucket, 
        Key: key,
        Body: data
    };
}

exports.backupFile = (params, callback) => {
    s3.copyObject(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);

            callback(false);
        } else {
            callback(true);
        }
    });
}