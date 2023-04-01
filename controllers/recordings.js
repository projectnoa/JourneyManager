// images.js

/**
 * Required External Modules
 */

 import { promisify } from 'util';

 import dateFormat from 'dateformat';

 import { unlink as _unlink, createReadStream } from 'fs';
 
 import Season from './../models/season.js';
 
 import fetcher from './../helpers/fetcher.js';
 import requestProcessor from './../helpers/audioUpload.js';
 
 import { info, error, warn } from './../helpers/winston.js';
 import { setNotice } from './../helpers/helper.js';
 
 import { submitS3File } from './../helpers/s3.js';
 import { jsonToXML } from './../helpers/xml.js';
 
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
 
export async function recordingsIndex(req, res) {
    try {
        // Get live feed
        info(' -- Getting live feed.');
        // Parse posts
        info(' -- Parsing items.');
        // Get feed
        let feed = await fetcher(feedURL);
        // Get published list
        let podcast = await fetcher(podcastURL);
        // Parse published list
        let published = podcast.rss.channel.item.map(item => ( { url: item.guid._, pubdate: item.pubDate } ));
        // Parse recordings
        let items = parseRecordings(feed, published);
        // Render page
        info(' -- Rendering page.');
        res.render('./recordings/index', {
            title: 'Recordings',
            authorized: true,
            items: items,
            entity: 'recordings'
        });
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Recordings', authorized: true });
    }
}
 
export async function recordingsCreateSeason(req, res) {
    try {
        // Get live feed
        info(' -- Getting live feed.');
        let feed = await fetcher(feedURL);
        // If no items then initialize
        if (feed.resources.collection == undefined) {
            feed.resources = { collection: [] };
        }
        // Append item
        info(' -- Appending item.');
        feed.resources.collection.push({ $: { season: (result.resources.length + 1), id: new Date().getTime(), date: new Date().toISOString().split('T')[0] } });
        // Update feed
        await updateFeed(feed);
        // Set notice
        setNotice(res, 'Season created!');
        // Respond
        info(' -- Success.');
        res.redirect('/recordings');
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Recordings', authorized: true });
    }
}
 
export async function recordingsCreateFile(req, res) {
    const unlink = promisify(_unlink);
    // Initialize file flag
    let fileDeleted = false;
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
            return res.redirect('back', 500, { title: 'Recordings', authorized: true });
        } else if (!req.file) {
            // Set notice
            setNotice(res, 'An error occured: No file provided');
            // Return error
            return res.redirect('back', 500, { title: 'Recordings', authorized: true });
        }
        // Get image collection id
        let collection_id = req.body.collection_id;
        let length = req.body.filesize;
        let duration = req.body.duration;
        // Upload file
        info(' -- Uploading image file.');
        let response = await uploadFile(req);
        // Delete file
        info(' -- Deleting file.');
        deleteTemp(req.file, unlink);
        // Flag file as deleted 
        fileDeleted = true;
        // Get live feed
        info(' -- Getting live feed.');
        let feed = await fetcher(feedURL);
        // Append item
        info(' -- Appending item.');
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
        setNotice(res, 'Recording saved!');
        // Respond
        info(' -- Success.');
        res.status(200).send({ redirectTo: '/recordings' });
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) deleteTemp(req.file, unlink);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Upload Recordings', authorized: true });
    }
}
 
let parseRecordings = (result, published) => {
     return result.resources.collection.map(item => new Season(item, published)).reverse();
}

let uploadFile = async (req) => {
    // Create file stream
    info(' -- Reading podcast file stream.');
    let fileStream = createReadStream(req.file.path);
    fileStream.on('error', function(err) {
        warn('File Error', err);
    });
    // Upload file
    info(' -- Uploading podcast file.');
    let uploadResponse = await submitS3File({
        Bucket: process.env.JM_AWS_S3_FILE_BUCKET + '/' + podcastFilesFolder,
        Key: req.file.filename,
        Body: fileStream,
        ACL: 'public-read',
        ContentType: 'audio/mp3'
    });

    return uploadResponse;
}

let updateFeed = async (feed) => {
    // Publish feed update
    info(' -- Publishing feed updates.');
    await submitS3File({
        Bucket: process.env.JM_AWS_S3_FILE_BUCKET,
        Key: resourceKey,
        Body: jsonToXML(feed),
        ACL: 'public-read'
    });
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
 
let deleteTemp = async (file, unlinker) => {
     return await unlinker(file.path);
}
 