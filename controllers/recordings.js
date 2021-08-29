// images.js

/**
 * Required External Modules
 */

 const util = require('util');

 var dateFormat = require('dateformat');

 var fs = require('fs');
 
 var Season = require('./../models/season');
 
 const fetcher = require('./../helpers/fetcher');
 const requestProcessor = require('./../helpers/audioUpload');
 
 const winston = require('./../helpers/winston');
 const helpers = require('./../helpers/helper');
 
 const s3 = require('./../helpers/s3');
 const xml = require('./../helpers/xml');
 
 /**
  * Variables
  */
 
 const feedURL = 'https://s3-us-west-2.amazonaws.com/podcasts.ajourneyforwisdom.com/settings.xml';
 const podcastURL = 'https://s3-us-west-2.amazonaws.com/rss.ajourneyforwisdom.com/rss/podcast.xml';
 const resourceKey = 'settings.xml';

 const podcastFilesFolder = '2021';
 
 /**
  *  Methods
  */
 
exports.recordingsIndex = async (req, res) => {
    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        // Parse posts
        winston.info(' -- Parsing items.');
        // Get feed
        let feed = await fetcher(feedURL);
        // Get published list
        let podcast = await fetcher(podcastURL);
        // Parse published list
        let published = podcast.rss.channel.item.map(item => ( { url: item.guid._, pubdate: item.pubDate } ));
        // Parse recordings
        let items = parseRecordings(feed, published);
        // Render page
        winston.info(' -- Rendering page.');
        res.render('./recordings/index', {
            title: 'Recordings',
            authorized: true,
            items: items,
            entity: 'recordings'
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Recordings', authorized: true });
    }
};
 
exports.recordingsCreateSeason = async (req, res) => {
    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        let feed = await fetcher(feedURL);
        // If no items then initialize
        if (feed.resources.collection == undefined) {
            feed.resources = { collection: [] };
        }
        // Append item
        winston.info(' -- Appending item.');
        feed.resources.collection.push({ $: { season: (result.resources.length + 1), id: new Date().getTime(), date: new Date().toISOString().split('T')[0] } });
        // Update feed
        await updateFeed(feed);
        // Set notice
        helpers.setNotice(res, 'Season created!');
        // Respond
        winston.info(' -- Success.');
        res.redirect('/recordings');
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Recordings', authorized: true });
    }
}
 
exports.recordingsCreateFile = async (req, res) => {
    const unlink = util.promisify(fs.unlink);
    // Initialize file flag
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
            return res.redirect('back', 500, { title: 'Recordings', authorized: true });
        } else if (!req.file) {
            // Set notice
            helpers.setNotice(res, 'An error occured: No file provided');
            // Return error
            return res.redirect('back', 500, { title: 'Recordings', authorized: true });
        }
        // Flag file as not deleted
        fileDeleted = false;
        // Get image collection id
        var collection_id = req.body.collection_id;
        var length = req.body.filesize;
        var duration = req.body.duration;
        // Upload file
        winston.info(' -- Uploading image file.');
        let response = await uploadFile(req);
        // Delete file
        winston.info(' -- Deleting file.');
        deleteTemp(req.file, unlink);
        // Flag file as deleted 
        fileDeleted = true;
        // Get live feed
        winston.info(' -- Getting live feed.');
        let feed = await fetcher(feedURL);
        // Append item
        winston.info(' -- Appending item.');
        let updatedFeed = updateCollection(feed, collection_id, (element) => {
            if (element.file == undefined) {
                element.file = [];
            } else if (!Array.isArray(element.file)) {
                element.file = [element.file];
            }

            let episode = parseInt(element.file[element.file.length - 1].$.episode) + 1;
            let title = `Episode ${episode}.mp3`

            let date = new Date();

            element.file.push({ 
                $: { 
                    id: date.getTime(), 
                    title: title, 
                    url: response.Location, 
                    episode: episode, 
                    length: length,
                    duration: duration,
                    date: dateFormat(date, "yyyy-mm-dd")
                } 
            });

            return element;
        });
        // Update feed
        await updateFeed(updatedFeed)
        // Set notice
        helpers.setNotice(res, 'Recording saved!');
        // Respond
        winston.info(' -- Success.');
        res.status(200).send({ redirectTo: '/recordings' });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Recordings', authorized: true });
    }
}
 
var parseRecordings = (result, published) => {
     return result.resources.collection.map(item => new Season(item, published)).reverse();
}

var uploadFile = async (req) => {
    // Create file stream
    winston.info(' -- Reading podcast file stream.');
    var fileStream = fs.createReadStream(req.file.path);
    fileStream.on('error', function(err) {
        winston.warn('File Error', err);
    });
    // Upload file
    winston.info(' -- Uploading podcast file.');
    let uploadResponse = await s3.submitS3File({
        Bucket: process.env.JM_AWS_S3_FILE_BUCKET + '/' + podcastFilesFolder,
        Key: req.file.filename,
        Body: fileStream,
        ACL: 'public-read',
        ContentType: 'audio/mp3'
    });

    return uploadResponse;
}

var updateFeed = async (feed) => {
    // Publish feed update
    winston.info(' -- Publishing feed updates.');
    let feedResponse = await s3.submitS3File({
        Bucket: process.env.JM_AWS_S3_FILE_BUCKET,
        Key: resourceKey,
        Body: xml.jsonToXML(feed),
        ACL: 'public-read'
    });
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
 
var deleteTemp = async (file, unlinker) => {
     return await unlinker(file.path);
}
 