// podcasts.js

/**
 * Required External Modules
 */

const util = require('util');

var fs = require('fs');

var moment = require('moment');

var Podcast = require('./../models/podcast');

const fetcher = require('./../helpers/fetcher');
const requestProcessor = require('./../helpers/audioUpload');

const winston = require('./../helpers/winston');

const helpers = require('./../helpers/helper');
const s3 = require('./../helpers/s3');
const xml = require('./../helpers/xml');
const wp = require('./../helpers/wordpress');

/**
 * Variables
 */

const feedURL = 'https://s3-us-west-2.amazonaws.com/rss.ajourneyforwisdom.com/rss/podcast.xml';
const resourceKey = 'podcast.xml';
const postURL = 'https://www.ajourneyforwisdom.com/podcast/';
const podcastURL = 'https://s3.us-west-2.amazonaws.com/podcasts.ajourneyforwisdom.com/';
const podcastImageURL = podcastURL + 'images/DTMG-profile-v3.jpeg';

/**
 *  Methods
 */

exports.podcastsIndex = async (req, res) => {
    let page = req.query.page;

    if (page == undefined) page = 1;

    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // Parse posts
        winston.info(' -- Parsing items.');
        let items = parsePodcast(result);

        let total = items.length;
        let pages = Math.ceil(total / 5);

        items = items.slice((page - 1) * 5, page * 5);

        // Render page
        winston.info(' -- Rendering page.');
        res.render('./podcasts/index', { 
            title: 'Podcasts', 
            authorized: true, 
            items: items, 
            entity: 'podcasts',
            page: parseInt(page), 
            total: total, 
            pages: pages
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error 
        res.redirect('back', { title: 'Podcasts', authorized: true });
    }
};

exports.podcastsNew = (req, res) => {
    res.render('./../views/podcasts/new', { title: 'New Podcast', authorized: true });
};

exports.podcastsCreate = async (req, res) => {
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
            return res.redirect('back', { title: 'New Podcast', authorized: true });
        } else if (!req.file) {
            // Set notice
            helpers.setNotice(res, 'An error occured: No file provided');
            // Return error
            return res.redirect('back', { title: 'New Podcast', authorized: true });
        }

        fileDeleted = false;

        // Back up feed
        winston.info(' -- Backing up podcast feed.');
        let backupResponse = await s3.backupFile({
            Bucket: process.env.JM_AWS_S3_RSS_BUCKET + '/backup', 
            CopySource: process.env.JM_AWS_S3_RSS_BUCKET + '/' + resourceKey, 
            Key: resourceKey.split('.').join('-' + Date.now() + '.')
        });

        // Validate backup response
        winston.info(' -- Validating backup.');
        if (backupResponse.$response.httpResponse.statusCode !== 200) {
            // Set notice
            helpers.setNotice(res, 'There was an error backing up the feed');
            // Return error
            return res.redirect('back', { title: 'New Podcast', authorized: true });
        }

        // Create file stream 
        winston.info(' -- Reading podcast file stream.');
        var fileStream = fs.createReadStream(req.file.path);
        fileStream.on('error', function(err) {
            winston.warn('File Error', err);
        });

        // Upload file 
        winston.info(' -- Uploading podcast file.');
        let uploadResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_FILE_BUCKET + '/' + req.body.season, 
            Key: req.file.filename,
            Body: fileStream,
            ACL: 'public-read'
        });

        // Validate form data
        winston.info(' -- Parsing form data.');

        // Format Dates
        let pdtDateString = new Date(req.body.pubDate).toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
        let gmtDateString = new Date(req.body.pubDate).toLocaleString("en-US", { timeZone: "GMT" });
        let localDateString = new Date(req.body.pubDate);
        // Set properties
        let title = helpers.sanitize(req.body.title);
        let description = helpers.sanitize(req.body.description);
        let keywords = helpers.sanitize(req.body.keywords);
        let tags = keywords.split(',').map(tag => tag.trim());
        let pdtPubDate = moment(new Date(pdtDateString));
        let gmtPubDate = moment(new Date(gmtDateString));
        let localPubDate = moment(new Date(localDateString));
        let season = req.body.season;
        let explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';
        let postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        let length = req.body.length;
        let duration = req.body.duration;
        let s3URL = uploadResponse.Location;

        // Create feed item
        winston.info(' -- Creating feed item.');
        let feedItem = {
            title: [title],
            'itunes:title': [title],
            'link': [postURL + postSlug],
            'pubDate': [`${pdtPubDate.format('ddd, D MMM YYYY HH:mm:ss')} PDT`],
            description: [description], 
            'enclosure': {
                $: {
                    url: s3URL,
                    length: Math.trunc(length),
                    type: 'audio/mpeg'
                }
            },
            guid: [s3URL],
            'itunes:duration': duration,
            'itunes:summary': [description],
            'itunes:image': {
                $: {
                    href: podcastImageURL
                }
            },
            'itunes:keywords': [keywords], 
            'itunes:explicit': [explicit]
        };
        
        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await fetcher(feedURL);

        // Append item
        winston.info(' -- Appending item.');
        result.rss.channel[0].item.push(feedItem);

        // Get episode count
        winston.info(' -- Getting episode count.');
        let episodeCount = result.rss.channel[0].item.length;
        
        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_RSS_BUCKET, 
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        // Delete file
        winston.info(' -- Deleting temp file.');
        await unlink(req.file.path);

        fileDeleted = true;

        // Publish podcast tags
        winston.info(' -- Publishing podcast tags');
        let tag_ids = await createTags(tags, req.session.accessToken);

        // Create podcast post
        winston.info(' -- Creating podcast post');
        let size = req.file.size / 1000000
        let futurePublish = localPubDate.isAfter(moment());

        // Instantiate podcast post
        let podcastPost = {
            slug: postSlug,
            status: futurePublish ? 'future' : 'publish',
            title: title,
            content: helpers.formatPost(description) + helpers.podcastFooter(),
            author: req.session.profile.id,
            excerpt: description.length > 250 ? description.slice(0, 250) + '...' : description,
            comment_status: 'closed',
            tags: tag_ids,
            meta: {
                audio_file: s3URL,
                date_recorded: localPubDate.format("DD-MM-yyyy"),
                duration: duration,
                episode_type: 'audio',
                explicit: req.body.explicit,
                filesize: Math.trunc(size) + ' Mb',
                itunes_episode_number: '' + episodeCount,
                itunes_episode_type: 'full',
                itunes_season_number: season === '2020' ? '1' : '2',
                itunes_title: title
            }
        }

        // Check if is a future post
        if (futurePublish) {
            podcastPost['date'] = localPubDate.format('YYYY-M-DTHH:mm:ss');
            podcastPost['date_gmt'] = gmtPubDate.format('YYYY-M-DTHH:mm:ss');
        }

        // Publish podcast post
        winston.info(' -- Publishing podcast post.');
        let succeeded = await wp.publishPodcast(podcastPost, req.session.accessToken);

        // Respond to response
        if (helpers.isDefined(succeeded)) {
            // Set notice
            helpers.setNotice(res, 'Podcast episode posted!');
            // Respond
            winston.info(' -- Success.');
            res.status(200).send({ redirectTo: '/podcasts' });
        } else {
            // Set notice
            helpers.setNotice(res, 'There was an error posting the podcast episode.');
            // Return error 
            winston.warn(' -- FAILURE.');
            res.redirect('back', { title: 'New Podcast', authorized: true });
        }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) await unlink(req.file.path);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error 
        res.redirect('back', { title: 'New Podcast', authorized: true });
    }
};

var parsePodcast = (result) => {
    return result.rss.channel[0].item.map(item => new Podcast(item)).reverse();
}

var createTags = async (tags, token) => {
    let tag_ids = [];

    for (let index = 0; index < tags.length; index++) {  
        try {
            let tag_data = await wp.publishTag({ 'name': tags[index] }, token);

            if (tag_data.id !== undefined) {
                tag_ids.push(tag_data.id);
            } else {
                tag_ids.push(tag_data);
            }
        } catch (err) {
            tag_ids.push(err.data.term_id);
        }
    }

    return tag_ids;
}