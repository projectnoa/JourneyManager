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

exports.createS3File = (data, key, bucket) => {
    return {
        Bucket: bucket, 
        Key: key,
        Body: data
    };
}

exports.backupFile = (params) => {
    return s3.copyObject(params).promise();
}