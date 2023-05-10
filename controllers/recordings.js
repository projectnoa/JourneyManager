// images.js

/**
 * Required External Modules
 */

import { promisify } from 'util';

import dateFormat from 'dateformat';

import { unlink as _unlink, createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';

import Season from './../models/season.js';

import fetcher from './../helpers/fetcher.js';
import requestProcessor from './../helpers/audioUpload.js';

import { info, error, warn } from './../helpers/winston.js';
import { setNotice, getFileLocation } from './../helpers/helper.js';

import { submitS3File } from './../helpers/s3.js';
import { jsonToXML } from './../helpers/xml.js';

import * as constants from './../helpers/constants.js';

/**
 * Variables
 */

const podcastFilesFolder = new Date().getFullYear().toString();

const filePath = './public/transcripts/index.json';

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
        let feed = await fetcher(constants.RECORDINGS_XML_URL);
        // Get published list
        let podcast = await fetcher(constants.FEED_XML_URL);

        const transcriptIndex = await getTranscriptIndex();

        // Parse published list
        let published = podcast.rss.channel.item.map(item => ( { 
            url: item.guid._, 
            pubdate: item.pubDate 
        } ));
        // Parse recordings
        let items = parseRecordings(feed, published, transcriptIndex.transcripts);
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
        let feed = await fetcher(constants.RECORDINGS_XML_URL);
        // If no items then initialize
        if (feed.resources.collection == undefined) {
            feed.resources = { collection: [] };
        }
        // Append item
        info(' -- Appending item.');
        feed.resources.collection.push({ $: { season: (feed.resources.collection.length + 1), id: new Date().getTime(), date: new Date().toISOString().split('T')[0] } });
        // Update feed
        let response = await updateFeed(feed);

        if (response.$metadata.httpStatusCode != 200) {
            throw new Error('Error creating new season.');
        }

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
        let length = typeof req.body.filesize === 'object' ? req.body.filesize[0] : req.body.filesize;
        let duration = req.body.duration;
        // Upload file
        info(' -- Uploading image file.');
        let response = await uploadFile(req);

        if (response.$metadata.httpStatusCode != 200) {
            throw new Error('Error uploading image file.');
        }

        // Delete file
        info(' -- Deleting file.');
        deleteTemp(req.file, unlink);
        // Flag file as deleted 
        fileDeleted = true;
        // Get live feed
        info(' -- Getting live feed.');
        let feed = await fetcher(constants.RECORDINGS_XML_URL);

        const location = getFileLocation(constants.PODCAST_S3_BUCKET, `${podcastFilesFolder}/${req.file.filename}`);

        // Append item
        info(' -- Appending item.');
        let updatedFeed = updateCollection(feed, collection_id, (element) => {
            let episode = 1;

            if (element.file == undefined) {
                element.file = [];
            } else {
                if (!Array.isArray(element.file)) {
                    element.file = [element.file];
                }

                episode = parseInt(element.file[element.file.length - 1].$.episode) + 1;
            }

            let title = `Episode ${episode}.mp3`

            let date = new Date();

            element.file.push({ 
                $: { 
                    id: date.getTime(), 
                    title: title, 
                    url: location, 
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

export async function recordingsSaveTranscript(req, res) {
    try {
        await saveTranscript(req.body.id, req.body.text);
        // Set notice
        setNotice(res, 'Transcript saved!');
        // Respond
        info(' -- Success.');
        res.redirect('/recordings');
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Transcript save', authorized: true });
    }
}

export async function recordingsSaveTranscriptAsync(req, res) {
    try {
        await saveTranscript(req.body.id, req.body.text);
        // Respond
        info(' -- Success.');
        res.status(200).send();
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Respond
        info(' -- Error.');
        res.status(500).send();
    }
}

let saveTranscript = async (id, text) => {
    // Get transcript file
    info(' -- Getting transcript file.');
    let transcriptIndex = await getTranscriptIndex();
    // If no items then initialize
    if (transcriptIndex.transcripts == undefined) {
        transcriptIndex = { transcripts: [] };
    }

    const transcriptPath = filePath.replace('index.json', `${id}.txt`);

    // Find the transcript with the specified id or create a new one
    let transcript = transcriptIndex.transcripts.find(t => t.id === id);

    if (transcript) {
        // Update date if transcript exists
        transcript.date = new Date().toISOString().split('T')[0];
    } else {
        // Append item if transcript doesn't exist
        info(' -- Appending item.');
        transcriptIndex.transcripts.push({ id: id, path: transcriptPath, date: new Date().toISOString().split('T')[0] });
    }

    // Update transcript file
    writeFileSync(filePath, JSON.stringify(transcriptIndex), 'utf-8');
    writeFileSync(transcriptPath, text, 'utf-8');
}
 
let parseRecordings = (result, published, transcripts) => {
     return result.resources.collection.map(item => new Season(item, published, transcripts)).reverse();
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
    return await submitS3File({
        Bucket: constants.PODCAST_S3_BUCKET,
        Key: `${podcastFilesFolder}/${req.file.filename}`,
        Body: fileStream,
        ACL: 'public-read',
        ContentType: 'audio/mp3'
    });
}

let updateFeed = async (feed) => {
    // Publish feed update
    info(' -- Publishing feed updates.');
    return await submitS3File({
        Bucket: constants.PODCAST_S3_BUCKET,
        Key: constants.SETTINGS_XML,
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

async function getTranscriptIndex() {
    try {
        // Check if the file exists
        if (existsSync(filePath)) {
            return readTranscriptsIndex();
        } else {
            return createTranscriptIndex();
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            return createTranscriptIndex();
        } else {
            console.error('Error accessing the file:', err);
        }
    }

    return null;
}

async function createTranscriptIndex() {
    // If the file does not exist, create it with an empty JSON object
    console.log('File does not exist. Creating...');
    
    try {
        writeFileSync(filePath, '{ "transcripts": [] }', 'utf-8');
        
        return readTranscriptsIndex();
    } catch (writeErr) {
        console.error('Error creating the file:', writeErr);
    }

    return null;
}

async function readTranscriptsIndex() {
    try {
        const data = readFileSync(filePath, 'utf-8');
    
        return JSON.parse(data);
    } catch (err) {
        console.error('Error:', err);
    }
  
    return null;
}