// s3.js

/**
 * Required External Modules
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

/**
 * Variables
 */

// Set the AWS Region.
const REGION = "us-west-2";

// Create an Amazon S3 service client object.
const s3Client = new S3Client({ 
    region: REGION, 
    accessKeyId: process.env.JM_AWS_S3_ID, 
    secretAccessKey: process.env.JM_AWS_S3_SEC
});

/**
 *  Methods
 */

export function submitS3File(params) {
    return s3Client.send(new PutObjectCommand(params)).promise();
}

export function deleteS3File(bucket, key) {
    return s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).promise();
}

export function backupFile(params) {
    return s3Client.send(new CopyObjectCommand(params)).promise();
}