// images.js

/**
 * Required External Modules
 */

import { promisify } from 'util';

import { unlink as _unlink, unlinkSync, createReadStream } from 'fs';
import { basename } from "path";

import jimp from 'jimp';

import sizeOf from 'image-size';

import Collection from './../models/collection.js';

import fetcher from './../helpers/fetcher.js';
import requestProcessor from './../helpers/imageUpload.js';

import { info, error } from './../helpers/winston.js';
import { setNotice, getFileLocation } from './../helpers/helper.js';

import { submitS3File, deleteS3File } from './../helpers/s3.js';
import { jsonToXML } from './../helpers/xml.js';

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

export async function imagesIndex(req, res) {
    let tab = req.query.tab;

    try {
        // Get live feed
        info(' -- Getting live feed.');

        let results = [];

        if (!sources.includes(tab)) tab = sources[0];

        // Parse posts
        info(' -- Parsing items.');
        for (const source of sources) {
            const url = feedURL[source];
            let result = await fetcher(url);

            let items = parseImages(result);

            let url_elements = url.split('/');
            let title = url_elements[url_elements.length - 2];

            results.push({ title: title, items: items, /*total: total, pages: pages, page: parseInt(page),*/ active: source === tab });
        };

        // Render page
        info(' -- Rendering page.');
        res.render('./images/index', {
            title: 'Images',
            authorized: true,
            results: results,
            entity: 'images'
        });
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Images', authorized: true });
    }
}

export function imagesNew(req, res) {
    res.render('./../views/images/new', { title: 'Upload Images', authorized: true });
}

export async function imagesCreateCollection(req, res) {
    let source = req.body.source;

    try {
        if (!sources.includes(source)) throw new Error('Missing source!')

        // Get live feed
        info(' -- Getting live feed.');
        let result = await fetcher(feedURL[source]);

        // If no items then initialize
        if (result.resources.collection == undefined) {
            result.resources = { collection: [] };
        }

        // Append item
        info(' -- Appending item.');
        result.resources.collection.push({ 
            $: { 
                title: req.body.title,
                id: new Date().getTime(), 
                date: new Date().toISOString().split('T')[0] 
            } 
        });

        // Publish feed update
        info(' -- Publishing feed updates.');
        let response = await submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET,
            Key: `${source}/${resourceKey}`,
            Body: jsonToXML(result),
            ACL: 'public-read'
        });

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error('Error creating new collection.');
        }

        // Set notice
        setNotice(res, 'Collection created!');

        // Respond
        info(' -- Success.');
        res.redirect('/images?tab=' + source);
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Images', authorized: true });
    }
}

export async function imagesCreateImage(req, res) {
    const unlink = promisify(_unlink);

    let fileDeleted = true;

    try {
        // Process request
        info(' -- Processing request.');
        await requestProcessor(req, res);

        // Validate file upload
        info(' -- Validating request.');
        if (req.fileValidationError) {
            // Set notice
            setNotice(res, `An error occured: ${req.fileValidationError}`);
            // Return error
            return res.redirect('back', 500, { title: 'Images', authorized: true });
        } else if (!req.file) {
            // Set notice
            setNotice(res, 'An error occured: No file provided');
            // Return error
            return res.redirect('back', 500, { title: 'Images', authorized: true });
        }

        fileDeleted = false;

        // Get image collection id
        let collection_id = req.body.collection_id;

        let source = req.body.source;

        if (!sources.includes(source)) throw new Error('Missing source!')

        // Compressing image
        info(' -- Compressing images.');
        let jimpImg = await jimp.read(req.file.path);
        jimpImg.quality(60);
        await jimpImg.writeAsync(req.file.path);

        const compressed_path = req.file.path;
        const compressed_name = basename(req.file.path);

        // Upload file
        info(' -- Uploading image file.');
        let response = await uploadImage({ filename: compressed_name, path: compressed_path }, source);

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error('Error uploading image.');
        }

        // Getting image dimentions
        info(' -- Getting image dimentions.');
        let dimensions = sizeOf(req.file.path);

        // Delete file
        info(' -- Deleting image files.');
        deleteTemp(req.file, unlink);

        fileDeleted = true;

        // Get live feed
        info(' -- Getting live feed.');
        let result = await fetcher(feedURL[source]);

        const location = getFileLocation(process.env.JM_AWS_S3_ASSETS_BUCKET, `${source}/${compressed_name}`);

        // Append item
        info(' -- Appending item.');
        let updatedResult = updateCollection(result, collection_id, (element) => {
            if (element.image == undefined) {
                element.image = [];
            } else if (!Array.isArray(element.image)) {
                element.image = [element.image];
            }

            element.image.push({ 
                $: { 
                    id: new Date().getTime(), 
                    title: compressed_name, 
                    url: location, 
                    width: dimensions.width, 
                    height: dimensions.height 
                } 
            });

            return element;
        });

        // Publish feed update
        info(' -- Publishing feed updates.');
        response = await submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET,
            Key: `${source}/${resourceKey}`,
            Body: jsonToXML(updatedResult),
            ACL: 'public-read'
        });

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error('Error creating new image.');
        }

        // Set notice
        setNotice(res, 'Image saved!');

        // Respond
        info(' -- Success.');
        res.status(200).send({ redirectTo: '/images?tab=' + source });
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Images', authorized: true });
    }
}

export async function imagesProcess(req, res) {
    const unlink = promisify(_unlink);

    let fileDeleted = false;

    try {
        // Process request
        info(' -- Processing request.');
        await requestProcessor(req, res);

        // Compressing image
        info(' -- Compressing images.');
        let jimpImg = await jimp.read(req.file.path);
        jimpImg.quality(60);
        await jimpImg.writeAsync(req.file.path);

        const filePath = req.file.path;
        const filename = basename(req.file.path);

        fileDeleted = true;

        // Returning image
        info(' -- Returning images.');
        res.download(filePath, filename, (err) => {
            if (err) {
                // Log error message
                error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
                // Set notice
                setNotice(res, `An error occured: ${err.message}`);
            }

            unlinkSync(filePath);
        });
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Images', authorized: true });
    }
}

export async function imagesCollectionDestroy(req, res) {
    // Get removed collection id
    let collection_id = req.body.id;
    let source = req.body.source;

    try {
        if (!sources.includes(source)) throw new Error('Missing source!')

        // Get live feed
        info(' -- Getting live feed.');
        let result = await fetcher(feedURL[source]);

        // Find collection
        info(' -- Finding collection.');
        let collection = result.resources.collection.find(item => item.$.id == collection_id);

        // Delete every image on collection
        info(' -- Deleting images in collection.');
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
        info(' -- Removing collection.');
        result.resources.collection = result.resources.collection.filter(item => item.$.id != collection_id);

        // Publish feed update
        info(' -- Publishing feed updates.');
        let response = await submitS3File({
            Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET,
            Key: `${source}/${resourceKey}`,
            Body: jsonToXML(result),
            ACL: 'public-read'
        });

        if (response.$metadata.httpStatusCode !== 200) {
            throw new Error('Error deleting collection.');
        }

        // Set notice
        setNotice(res, 'Collection deleted!');

        // Respond
        info(' -- Success.');
        res.redirect('/images?tab=' + source);
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Images', authorized: true });
    }
}

export async function imagesImageDestroy(req, res) {
    // Get removed image id
    let id = req.body.id;
    // Get removed image collection id
    let collection_id = req.body.collection_id;
    // Get removed image key
    let key = req.body.key;
    let source = req.body.source;

    try {
        if (!sources.includes(source)) throw new Error('Missing source!')

        // Remove image from S3
        info(' -- Deleting image file.');
        let response = await removeImage(key, source);

        if (response.$response.httpResponse.statusCode === 204) {
            // Get live feed
            info(' -- Getting live feed.');
            let result = await fetcher(feedURL[source]);

            // Filter item
            info(' -- Filtering image feed.');
            let updatedResult = updateCollection(result, collection_id, (collection) => {
                if (Array.isArray(collection.image)) {
                    collection.image = collection.image.filter(item => item.$.id !== id);
                } else if (collection.image.$.id === id) {
                    collection.image = [];
                }
                
                return collection;
            });

            // Publish feed update
            info(' -- Publishing feed updates.');
            let response = await submitS3File({
                Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET,
                Key: `${source}/${resourceKey}`,
                Body: jsonToXML(updatedResult),
                ACL: 'public-read'
            });

            if (response.$metadata.httpStatusCode !== 200) {
                throw new Error('Error deleting image record.');
            }
        }

        // Set notice
        setNotice(res, 'Image deleted!');

        // Respond
        info(' -- Success.');
        res.redirect('/images?tab=' + source);
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Images', authorized: true });
    }
}

let parseImages = (result) => {
    return result.resources.collection !== undefined ? result.resources.collection.map(item => new Collection(item)).reverse() : [];
}

let removeImage = async (key, source) => {
    return await deleteS3File(process.env.JM_AWS_S3_ASSETS_BUCKET, source + '/' + key);
}

let updateCollection = (result, id, updateCallback) => {
    for (let index = 0; index < result.resources.collection.length; index++) {
        const element = result.resources.collection[index];

        if (element.$.id == id) {
            result.resources.collection[index] = updateCallback(element);
            break;
        }
    }

    return result;
}

let uploadImage = async (file, source) => {
    // Create file stream
    let fileStream = createReadStream(file.path);
    fileStream.on('error', function(err) {
        info('File Error', err);
    });
    // Submit to S3
    return await submitS3File({
        Bucket: process.env.JM_AWS_S3_ASSETS_BUCKET,
        Key: `${source}/${file.filename}`,
        Body: fileStream,
        ACL: 'public-read'
    });
}

let deleteTemp = async (file, unlinker) => {
    return await unlinker(file.path);
}
