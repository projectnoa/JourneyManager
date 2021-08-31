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
const helpers = require('./../helpers/helper');

const s3 = require('./../helpers/s3');
const xml = require('./../helpers/xml');

/**
 * Variables
 */

const feedURL = {
    posts: 'https://s3-us-west-2.amazonaws.com/assets.ajourneyforwisdom.com/posts/settings.xml', 
    global: 'https://s3-us-west-2.amazonaws.com/assets.ajourneyforwisdom.com/global/settings.xml', 
    emails: 'https://s3-us-west-2.amazonaws.com/assets.ajourneyforwisdom.com/emails/settings.xml'
};

const sources = ['posts', 'global', 'emails'];

const resourceKey = 'settings.xml';

/**
 *  Methods
 */

exports.imagesIndex = async (req, res) => {
    let page = req.query.page;
    let tab = req.query.tab;

    if (page == undefined) page = 1;

    try {
        // Get live feed
        winston.info(' -- Getting live feed.');

        var results = [];

        if (!sources.includes(tab)) tab = sources[0];

        // Parse posts
        winston.info(' -- Parsing items.');
        for (const source of sources) {
            const url = feedURL[source];
            let result = await fetcher(url);

            let items = parseImages(result);

            // let total = items.length;
            // let pages = Math.ceil(total / 5);

            // items = items.slice((page - 1) * 5, page * 5);

            let url_elements = url.split('/');
            let title = url_elements[url_elements.length - 2];

            results.push({ title: title, items: items, /*total: total, pages: pages, page: parseInt(page),*/ active: source === tab });
        };

        // Render page
        winston.info(' -- Rendering page.');
        res.render('./images/index', {
            title: 'Images',
            authorized: true,
            results: results,
            entity: 'images'
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Images', authorized: true });
    }
};

exports.imagesNew = (req, res) => {
    res.render('./../views/images/new', { title: 'Upload Images', authorized: true });
};

exports.imagesCreateCollection = async (req, res) => {
    let source = req.body.source;

    try {
        if (!sources.includes(source)) throw 'Missing source!'

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL[source]);

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
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/' + source,
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        // Set notice
        helpers.setNotice(res, 'Collection created!');

        // Respond
        winston.info(' -- Success.');
        res.redirect('/images?tab=' + source);
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Images', authorized: true });
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
            // Set notice
            helpers.setNotice(res, `An error occured: ${req.fileValidationError}`);
            // Return error
            return res.redirect('back', 500, { title: 'Images', authorized: true });
        } else if (!req.file) {
            // Set notice
            helpers.setNotice(res, 'An error occured: No file provided');
            // Return error
            return res.redirect('back', 500, { title: 'Images', authorized: true });
        }

        fileDeleted = false;

        // Get image collection id
        var collection_id = req.body.collection_id;

        let source = req.body.source;

        if (!sources.includes(source)) throw 'Missing source!'

        // Compressing image
        winston.info(' -- Compressing images.');
        let jimpImg = await Jimp.read(req.file.path);
        await jimpImg.quality(60);
        await jimpImg.writeAsync(req.file.path);

        const compressed_path = req.file.path;
        const compressed_name = path.basename(req.file.path);

        // Upload file
        winston.info(' -- Uploading image file.');
        let response = await uploadImage({ filename: compressed_name, path: compressed_path }, source);

        // Getting image dimentions
        winston.info(' -- Getting image dimentions.');
        var dimensions = sizeOf(req.file.path);

        // Delete file
        winston.info(' -- Deleting image files.');
        deleteTemp(req.file, unlink);

        fileDeleted = true;

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL[source]);

        // Append item
        winston.info(' -- Appending item.');
        let updatedResult = updateCollection(result, collection_id, (element) => {
            if (element.image == undefined) {
                element.image = [];
            } else if (!Array.isArray(element.image)) {
                element.image = [element.image];
            }

            element.image.push({ $: { id: new Date().getTime(), title: compressed_name, url: response.Location, width: dimensions.width, height: dimensions.height } });

            return element;
        });

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/' + source,
            Key: resourceKey,
            Body: xml.jsonToXML(updatedResult),
            ACL: 'public-read'
        });

        // Set notice
        helpers.setNotice(res, 'Image saved!');

        // Respond
        winston.info(' -- Success.');
        res.status(200).send({ redirectTo: '/images?tab=' + source });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Images', authorized: true });
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
        await jimpImg.quality(60);
        await jimpImg.writeAsync(req.file.path);

        const filePath = req.file.path;
        const filename = path.basename(req.file.path);

        fileDeleted = true;

        // Returning image
        winston.info(' -- Returning images.');
        res.download(filePath, filename, (err) => {
            if (err) {
                // Log error message
                winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
                // Set notice
                helpers.setNotice(res, `An error occured: ${err.message}`);
            }

            fs.unlinkSync(filePath);
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Images', authorized: true });
    }
};

exports.imagesCollectionDestroy = async (req, res) => {
    // Get removed collection id
    var collection_id = req.body.id;
    let source = req.body.source;

    try {
        if (!sources.includes(source)) throw 'Missing source!'

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL[source]);

        // Find collection
        winston.info(' -- Finding collection.');
        let collection = result.resources.collection.find(item => item.$.id == collection_id);

        // Delete every image on collection
        winston.info(' -- Deleting images in collection.');
        if (Array.isArray(collection.image)) {
            // Delete every image on collection
            for (const image of collection.image) {
                const key = image.$.title;
                await removeImage(key, source);
            }
        } else if (collection.image !== null) {
            const key = collection.image.$.title;
            await removeImage(key, source);
        }

        // Exclude collection
        winston.info(' -- Removing collection.');
        result.resources.collection = result.resources.collection.filter(item => item.$.id != collection_id);

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/' + source,
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        // Set notice
        helpers.setNotice(res, 'Collection deleted!');

        // Respond
        winston.info(' -- Success.');
        res.redirect('/images?tab=' + source);
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Images', authorized: true });
    }
};

exports.imagesImageDestroy = async (req, res) => {
    // Get removed image id
    var id = req.body.id;
    // Get removed image collection id
    var collection_id = req.body.collection_id;
    // Get removed image key
    var key = req.body.key;
    let source = req.body.source;

    try {
        if (!sources.includes(source)) throw 'Missing source!'

        // Remove image from S3
        winston.info(' -- Deleting image file.');
        let response = await removeImage(key, source);

        if (response.$response.httpResponse.statusCode === 204) {
            // Get live feed
            winston.info(' -- Getting live feed.');
            let result = await fetcher(feedURL[source]);

            // Filter item
            winston.info(' -- Filtering image feed.');
            let updatedResult = updateCollection(result, collection_id, (collection) => {
                if (Array.isArray(collection.image)) {
                    collection.image = collection.image.filter(item => item.$.id !== id);
                } else if (collection.image.$.id === id) {
                    collection.image = [];
                }
                
                return collection;
            });

            // Publish feed update
            winston.info(' -- Publishing feed updates.');
            let feedResponse = await s3.submitS3File({
                Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/' + source,
                Key: resourceKey,
                Body: xml.jsonToXML(updatedResult),
                ACL: 'public-read'
            });
        }

        // Set notice
        helpers.setNotice(res, 'Image deleted!');

        // Respond
        winston.info(' -- Success.');
        res.redirect('/images?tab=' + source);
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Images', authorized: true });
    }
};

var parseImages = (result) => {
    return result.resources.collection !== undefined ? result.resources.collection.map(item => new Collection(item)).reverse() : [];
}

var removeImage = async (key, source) => {
    return await s3.deleteS3File(process.env.JM_AWS_S3_ASSETS_BUCKET, source + '/' + key);
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

var uploadImage = async (file, source) => {
    // Create file stream
    var fileStream = fs.createReadStream(file.path);
    fileStream.on('error', function(err) {
        winston.info('File Error', err);
    });
    // Submit to S3
    return await s3.submitS3File({
        Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET + '/' + source,
        Key: file.filename,
        Body: fileStream,
        ACL: 'public-read'
    });
}

var deleteTemp = async (file, unlinker) => {
    return await unlinker(file.path);
}
