// images.js

/**
 * Required External Modules
 */

const util = require('util');

var fs = require('fs');
const path = require("path");

const Jimp = require('jimp');

var sizeOf = require('image-size');

var Collection = require('./../models/collection');

const fetcher = require('./../helpers/fetcher');
const requestProcessor = require('./../helpers/imageUpload');

const winston = require('./../helpers/winston');

const s3 = require('./../helpers/s3');
const xml = require('./../helpers/xml');

/**
 * Variables
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/assets.ajourneyforwisdom.com/posts/settings.xml';
const resourceKey = 'settings.xml';

/**
 *  Methods
 */

exports.imagesIndex = async (req, res) => {
    let page = req.query.page;

    if (page == undefined) page = 1;

    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // Parse posts
        winston.info(' -- Parsing items.');
        let items = parseImages(result);

        let total = items.length;
        let pages = Math.ceil(total / 5);

        items = items.slice((page - 1) * 5, page * 5);

        // Render page
        winston.info(' -- Rendering page.');
        res.render('./images/index', { 
            title: 'Images', 
            authorized: true, 
            items: items, 
            entity: 'images',
            page: parseInt(page), 
            total: total, 
            pages: pages
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
};

exports.imagesNew = (req, res) => {
    res.render('./../views/images/new', { title: 'Upload Images', authorized: true });
};

exports.imagesCreateCollection = async (req, res) => {
    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // If no items then initialize
        if (result.resources.collection == undefined) {
            result.resources = { collection: [] };
        }
        
        // Append item
        winston.info(' -- Appending item.');
        result.resources.collection.push({ $: { title: req.body.title, id: new Date().getTime(), date: new Date().toISOString().split('T')[0] } });

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        // Respond
        winston.info(' -- Success.');
        res.redirect('/images');
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
}

exports.imagesCreateImage = async (req, res) => {
    const unlink = util.promisify(fs.unlink);

    let fileDeleted = true;

    try {
        // Process request
        winston.info(' -- Processing request.');
        await requestProcessor(req, res);

        // Validate file upload
        winston.info(' -- Validating request.');
        if (req.fileValidationError) {
            // Return error
            return res.status(500).send({ message: `An error occured: ${req.fileValidationError}` });
        } else if (!req.file) {
            // Return error
            return res.status(500).send({ message: `An error occured: No file provided` });
        }

        fileDeleted = false;

        // Get image collection id
        var collection_id = req.body.collection_id;

        // Compressing image
        winston.info(' -- Compressing images.');
        let jimpImg = await Jimp.read(req.file.path);
        await jimpImg.quality(80);
        await jimpImg.writeAsync(req.file.path);

        const compressed_path = req.file.path;
        const compressed_name = path.basename(req.file.path);

        // Upload file 
        winston.info(' -- Uploading image file.');
        let response = await uploadImage({ filename: compressed_name, path: compressed_path });

        // Getting image dimentions 
        winston.info(' -- Getting image dimentions.');
        var dimensions = sizeOf(req.file.path);

        // Delete file
        winston.info(' -- Deleting image files.');
        deleteTemp(req.file, unlink);

        fileDeleted = true;

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // Append item
        winston.info(' -- Appending item.');
        let updatedResult = updateCollection(result, collection_id, (element) => {
            if (element.image == undefined) element.image = [];

            element.image.push({ $: { id: new Date().getTime(), title: compressed_name, url: response.Location, width: dimensions.width, height: dimensions.height } });

            return element;
        });

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(updatedResult),
            ACL: 'public-read'
        });

        // Respond
        winston.info(' -- Success.');
        res.status(200).send({ redirectTo: '/images' });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
}

exports.imagesProcess = async (req, res) => {
    const unlink = util.promisify(fs.unlink);

    let fileDeleted = true;

    try {
        // Process request
        winston.info(' -- Processing request.');
        await requestProcessor(req, res);

        fileDeleted = false;

        // Compressing image
        winston.info(' -- Compressing images.');
        let jimpImg = await Jimp.read(req.file.path);
        await jimpImg.quality(80);
        await jimpImg.writeAsync(req.file.path);

        const filePath = req.file.path;
        const filename = path.basename(req.file.path);

        fileDeleted = true;

        // Returning image
        winston.info(' -- Returning images.');
        res.download(filePath, filename, (err) => {
            if (err) {
                winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
            }
          
            fs.unlinkSync(filePath);
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
};

exports.imagesCollectionDestroy = async (req, res) => {
    // Get removed collection id
    var collection_id = req.body.id;

    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // Find collection
        winston.info(' -- Finding collection.');
        let collection = result.resources.collection.find(item => item.$.id == collection_id);

        // Delete every image on collection
        winston.info(' -- Deleting images in collection.');
        if (collection.image !== undefined) {
            // Delete every image on collection
            for (const image of collection.image) {
                const key = image.$.title;
                await removeImage(key);
            }
        }

        // Exclude collection
        winston.info(' -- Removing collection.');
        result.resources.collection = result.resources.collection.filter(item => item.$.id != collection_id);

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        // Respond
        winston.info(' -- Success.');
        res.redirect('/images');
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
};

exports.imagesImageDestroy = async (req, res) => {
    // Get removed image id
    var id = req.body.id;
    // Get removed image collection id
    var collection_id = req.body.collection_id;
    // Get removed image key
    var key = req.body.key;

    try {
        // Remove image from S3
        winston.info(' -- Deleting image file.');
        let response = await removeImage(key);

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // Filter item
        winston.info(' -- Filtering image feed.');
        let updatedResult = updateCollection(result, collection_id, (element) => {
            element.image = element.image.filter(item => item.$.id !== id);
            
            return element;
        });

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/posts', 
            Key: resourceKey,
            Body: xml.jsonToXML(updatedResult),
            ACL: 'public-read'
        });

        // Respond
        winston.info(' -- Success.');
        res.redirect('/images');
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
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
        winston.info('File Error', err);
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