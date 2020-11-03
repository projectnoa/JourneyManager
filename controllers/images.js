// images.js

/**
 * Required External Modules
 */

const util = require('util');

var fs = require('fs');

var moment = require('moment');

var Collection = require('./../models/collection');

const helpers = require('./../helpers/helper');
const fetcher = require('./../helpers/fetcher');
const s3 = require('./../helpers/s3');
const upload = require('./../helpers/imagesUpload');

/**
 * Variables
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/assets.ajourneyforwisdom.com/posts/settings.xml';
const resourceKey = 'settings.xml';

/**
 *  Methods
 */

exports.imagesIndex = async (req, res, next) => {
    try {
        let result = await fetcher(feedURL);

        res.render('./images/index', { title: 'Images', authorized: true, items: parseImages(result) });
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.send({ message: err.message });
    }
};

exports.imagesNew = (req, res, next) => {
    res.render('./../views/images/new', { title: 'Upload Images', authorized: true });
};

exports.imagesCreate = async (req, res, next) => {
    const unlink = util.promisify(fs.unlink);

    let responses = [];
    let cleanup = [];

    try {
        // Process form data
        await upload(req, res);
        // console.log(req.files);

        if (req.files.length <= 0) {
            return res.status(500).send({ message: `You must select at least 1 file.` });
        }
        // Upload files 
        console.log(' -- Uploading image files.');
        
        req.files.array.forEach(file => { responses.push(uploadImage(file)) });
        // Delete file
        console.log(' -- Deleting image files.');
        
        req.files.array.forEach(file => { cleanup.push(deleteTemp(file, unlink)) });
        // Respond
        console.log(' -- Success.');
        res.status(200).send({ redirectTo: '/podcasts' });
    } catch (err) {
        // Log error message
        console.log(err);

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(500).send({ message: "Too many files to upload." });
        }
        // Delete file
        req.files.array.forEach(file => { cleanup.push(deleteTemp(file, unlink)) });
        // Return error 
        res.status(500).send({ message: `Error when trying upload many files: ${err}` });
    }
};

exports.imagesDestroy = (req, res, next) => {
    // Get removed tweet id
    var id = req.params.id;
    // Remove tweet
    removeImage(id)
    .then(succeeded => {
      if (succeeded) {
        res.redirect('/images');
      } else {
        res.redirect('back', { title: 'Upload Images', authorized: true, notice: 'There was an error.' });
      }
    })
    .catch((err) => {
      // Log error message
      console.log(err);
      // Return error 
      res.send({ message: err.message });
    });
};

var parseImages = (result) => {
    return result.resources.collection.map(item => new Collection(item));
}

var removeImage = (id) => {

}

var uploadImage = async (file) => {
    // Create file stream 
    var fileStream = fs.createReadStream(file.path);
    fileStream.on('error', function(err) {
        console.log('File Error', err);
    });
    // Submit to S3
    return await s3.submitS3File({
        Bucket: process.env.AWS_S3_ASSETS_BUCKET + '/posts', 
        Key: file.filename,
        Body: fileStream,
        ACL: 'public-read'
    })
}

var deleteTemp = async (file, unlinker) => {
    return await unlinker(file.path);
}