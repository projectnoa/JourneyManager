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

exports.submitS3File = (params) => {
    return s3.upload(params).promise();
}

exports.deleteS3File = (bucket, key) => {
    return s3.deleteObject({ Bucket: bucket, Key: key }).promise();
}

exports.backupFile = (params) => {
    return s3.copyObject(params).promise();
}