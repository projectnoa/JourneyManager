// images.js

/**
 * Required External Modules
 */

const util = require('util');

var fs = require('fs');
const path = require("path");

var moment = require('moment');

var sizeOf = require('image-size');

var Collection = require('./../models/collection');

const helpers = require('./../helpers/helper');
const fetcher = require('./../helpers/fetcher');
const s3 = require('./../helpers/s3');
const xml = require('./../helpers/xml');
const upload = require('./../helpers/imageUpload');
const imageCompressor = require('./../helpers/imageCompressor');

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

exports.imagesCreateCollection = async (req, res, next) => {
    try {
        // Get live data
        let result = await fetcher(feedURL);
        // If no items then initialize
        if (result.resources.collection == undefined) {
            result.resources = { collection: [] };
        }
        // Append item
        result.resources.collection.push({ $: { title: req.body.title, id: new Date().getTime(), date: new Date().toISOString().split('T')[0] } });

        // Publish feed update
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        res.redirect('/images');
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.status(500).send({ message: err.message });
    }
}

exports.imagesCreateImage = async (req, res, next) => {
    const unlink = util.promisify(fs.unlink);
    let compressed_data = {};

    try {
        // Process form data
        await upload(req, res);
        // console.log(req.files);

        // Get image collection id
        var collection_id = req.body.collection_id;

        console.log(' -- Compressing images.');

        const { statistics, errors } = await imageCompressor();

        if (errors.length > 0) throw errors[0];

        // Upload files 
        console.log(' -- Uploading image files.');

        compressed_data = statistics[0];
        const compressed_path = path.join(`${__dirname}/../${compressed_data.path_out_new}`);
        const compressed_name = path.basename(compressed_data.path_out_new);
        let response = await uploadImage({ filename: compressed_name, path: compressed_path });

        var dimensions = sizeOf(compressed_data.path_out_new);

        // Delete file
        deleteTemp({ path: compressed_data.path_out_new }, unlink);

        // Get live data
        let result = await fetcher(feedURL);
        // Append item
        let updatedResult = updateCollection(result, collection_id, (element) => {
            if (element.image == undefined) element.image = [];

            element.image.push({ $: { id: new Date().getTime(), title: compressed_name, url: response.Location, width: dimensions.width, height: dimensions.height } });

            return element;
        });

        // Publish feed update
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(updatedResult),
            ACL: 'public-read'
        });

        // Delete file
        console.log(' -- Deleting image files.');

        deleteTemp(req.file, unlink);
        // Respond
        console.log(' -- Success.');
        res.status(200).send({ redirectTo: '/images' });
    } catch (err) {
        // Log error message
        console.log(err);

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(500).send({ message: "Too many files to upload." });
        }
        // Delete file
        deleteTemp(req.file, unlink);
        if (compressed_data.path_out_new) deleteTemp({ path: compressed_data.path_out_new }, unlink);
        // Return error 
        res.status(500).send({ message: `Error when trying upload many files: ${err.message}` });
    }
}

exports.imagesProcess = async (req, res, next) => {
    const unlink = util.promisify(fs.unlink);

    try {
        // Process form data
        await upload(req, res);

        console.log(' -- Compressing images.');

        const { statistics, errors } = await imageCompressor();

        if (errors.length > 0) throw errors[0];

        const compressed_data = statistics[0];
        const filePath = compressed_data.path_out_new;
        const filename = path.basename(compressed_data.path_out_new);

        // Delete file
        deleteTemp(req.file, unlink);

        res.download(filePath, filename, (err) => {
            if (err) {
              console.log(err); // Check error if you want
            }
          
            fs.unlinkSync(filePath); // If you don't need callback
        });
    } catch (err) {
        // Log error message
        console.log(err);

        if (req.file) deleteTemp(req.file, unlink);

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(500).send({ message: "Too many files to upload." });
        }
    }
};

exports.imagesCollectionDestroy = async (req, res, next) => {
    // Get removed collection id
    var collection_id = req.body.id;

    try {
        // Get live data
        let result = await fetcher(feedURL);
        // Find collection
        let collection = result.resources.collection.find(item => item.$.id == collection_id);

        if (collection.image !== undefined) {
            // Delete every image on collection
            for (const image of collection.image) {
                const key = image.$.title;
                await removeImage(key);
            }
        }
        // Exclude collection
        result.resources.collection = result.resources.collection.filter(item => item.$.id != collection_id);
        // Publish feed update
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        res.redirect('/images');
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.status(500).send({ message: err.message });
    }
};

exports.imagesImageDestroy = async (req, res, next) => {
    // Get removed image id
    var id = req.body.id;
    // Get removed image collection id
    var collection_id = req.body.collection_id;
    // Get removed image key
    var key = req.body.key;

    try {
        let response = await removeImage(key);

        // Get live data
        let result = await fetcher(feedURL);
        // Filter item
        let updatedResult = updateCollection(result, collection_id, (element) => {
            element.image = element.image.filter(item => item.$.id !== id);
            
            return element;
        });
        // Publish feed update
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(updatedResult),
            ACL: 'public-read'
        });

        res.redirect('/images');
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.status(500).send({ message: err.message });
    }
};

var parseImages = (result) => {
    return result.resources.collection !== undefined ? result.resources.collection.map(item => new Collection(item)).reverse() : [];
}

var removeImage = async (key) => {
    return await s3.deleteS3File(process.env.JM_AWS_S3_ASSETS_BUCKET, 'posts/' + key);
}

var updateCollection = (result, id, updateCallback) => {
    for (let index = 0; index < result.resources.collection.length; index++) {
        const element = result.resources.collection[index];

        if (element.$.id == id) {
            result.resources.collection[index] = updateCallback(element);
            break;
        }
    }

    return result;
}

var uploadImage = async (file) => {
    // Create file stream 
    var fileStream = fs.createReadStream(file.path);
    fileStream.on('error', function(err) {
        console.log('File Error', err);
    });
    // Submit to S3
    return await s3.submitS3File({
        Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
        Key: file.filename,
        Body: fileStream,
        ACL: 'public-read'
    });
}

var deleteTemp = async (file, unlinker) => {
    return await unlinker(file.path);
}