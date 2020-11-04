// podcasts.js

/**
 * Required External Modules
 */

const util = require('util');

var fs = require('fs');

const { getAudioDurationInSeconds } = require('get-audio-duration');

var moment = require('moment');

var Podcast = require('./../models/podcast');

const helpers = require('./../helpers/helper');
const fetcher = require('./../helpers/fetcher');
const s3 = require('./../helpers/s3');
const xml = require('./../helpers/xml');
const wp = require('./../helpers/wordpress');
const upload = require('./../helpers/audioUpload');

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

exports.podcastsIndex = async (req, res, next) => {
    try {
        let result = await fetcher(feedURL);

        res.render('./podcasts/index', { title: 'Podcasts', authorized: true, items: parsePodcast(result) });
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.send({ message: err.message });
    }
};

exports.podcastsNew = (req, res, next) => {
    res.render('./../views/podcasts/new', { title: 'New Podcast', authorized: true });
};

exports.podcastsCreate = async (req, res, next) => {
    const unlink = util.promisify(fs.unlink);
    let fileDeleted = true;
    
    try {
        // Process form data
        await upload(req, res);
        // Validate file upload
        if (req.fileValidationError) {
            // Return error
            return res.status(500).send({ message: req.fileValidationError });
        } else if (!req.file) {
            // Return error
            return res.status(500).send({ message: 'Please select the mp3 file to upload' });
        }

        fileDeleted = false;

        console.log(' -- Backing up podcast feed.');

        let backupResponse = await s3.backupFile({
            Bucket: process.env.AWS_S3_RSS_BUCKET + '/backup', 
            CopySource: process.env.AWS_S3_RSS_BUCKET + '/' + resourceKey, 
            Key: resourceKey.split('.').join('-' + Date.now() + '.')
        });

        if (backupResponse.$response.httpResponse.statusCode !== 200) return res.status(500).send({ message: 'There was an error backing up the feed' });

        console.log(' -- Uploading podcast file.');
        // Create file stream 
        var fileStream = fs.createReadStream(req.file.path);
        fileStream.on('error', function(err) {
            console.log('File Error', err);
        });
        // Submit to S3
        let uploadResponse = await s3.submitS3File({
            Bucket: process.env.AWS_S3_FILE_BUCKET + '/' + req.body.season, 
            Key: req.file.filename,
            Body: fileStream
        });

        console.log(' -- Getting audion duration.');

        let duration = await getAudioDurationInSeconds(req.file.path);

        console.log(' -- Publishing podcast feed.');
        // Set properties
        let title = helpers.sanitize(req.body.title);
        let description = helpers.sanitize(req.body.description);
        let keywords = helpers.sanitize(req.body.keywords);
        let tags = keywords.split(',').map(tag => tag.trim());
        let pubDate = moment(req.body.pubDate);
        let season = req.body.season;
        let explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';
        let postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        let length = duration * 1000;
        let lengthString = new Date(length).toISOString().substr(11, 8);
        let s3URL = uploadResponse.Location;
        // Create feed item
        let feedItem = {
            title: [title],
            'itunes:title': [title],
            'link': [postURL + postSlug],
            pubdate: [pubDate.format('ddd, D MMM YYYY HH:mm:ss Z')],
            description: [description], 
            'enclosure': {
                $: {
                    url: s3URL,
                    length: Math.trunc(length),
                    type: 'audio/mpeg'
                }
            },
            guid: [s3URL],
            'itunes:duration': lengthString,
            'itunes:summary': [description],
            'itunes:image': {
                $: {
                    href: podcastImageURL
                }
            },
            'itunes:keywords': [keywords], 
            'itunes:explicit': [explicit]
        };

        // Get live data
        let result = await fetcher(feedURL);
        // Append item
        result.rss.channel[0].item.push(feedItem);
        // Get episode count
        let episodeCount = result.rss.channel[0].item.length;
        // Publish feed update
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.AWS_S3_RSS_BUCKET, 
            Key: resourceKey,
            Body: xml.jsonToXML(result)
        })

        console.log(' -- Deleting temp file.');

        // Delete file
        if (req.file) await unlink(req.file.path);

        fileDeleted = true;

        console.log(' -- Publishing podcast tags');

        let tag_ids = await createTags(tags, req.session.accessToken);

        console.log(' -- Publishing podcast post.');

        let size = req.file.size / 1000000
        let futurePublish = pubDate.isAfter(moment());
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
                date_recorded: pubDate.format("DD-MM-yyyy"),
                duration: lengthString,
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
            podcastPost['date'] = pubDate.format();
        }
        // Create podcast post
        let succeeded = await wp.publishPodcast(podcastPost, req.session.accessToken);
        // Respond to response
        if (helpers.isDefined(succeeded)) {
            console.log(' -- Success.');

            res.status(200).send({ redirectTo: '/podcasts' });
        } else {
            console.log(' -- FAILURE.');
            // Return error 
            res.status(500).send({ message: 'There was an error posting the podcast post.' });
        }
    } catch (err) {
        // Log error message
        console.log(err);
        // Delete file
        if (fileDeleted === false) await unlink(req.file.path);
        // Return error 
        res.status(500).send({ message: err.message });
    }
};

var parsePodcast = (result) => {
    return result.rss.channel[0].item.map(item => new Podcast(item)).reverse();
}

var createTags = async (tags, token) => {
    let tag_ids = [];

    for (let index = 0; index < tags.length; index++) {  
        try {
            let tag_id = await wp.publishTag({ 'name': tags[index] }, token);
            tag_ids.push(tag_id);
        } catch (err) {
            tag_ids.push(err.data.term_id);
        }
    }

    return tag_ids;
}