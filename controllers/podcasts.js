// podcasts.js

/**
 * Required External Modules
 */

var fetch = require('node-fetch');

const util = require('util');

const multer = require('multer');
const path = require('path');

var fs = require('fs');

const { getAudioDurationInSeconds } = require('get-audio-duration');

var moment = require('moment');

var Podcast = require('./../models/podcast');

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

exports.podcastsIndex = (req, res, next) => {
    getPodcast()
    .then(result => {
        res.render('./podcasts/index', { title: 'Podcasts', authorized: true, items: parsePodcast(result) }); 
    })
    .catch((err) => {
        // Log error message
        console.log(err);
        // Return error 
        res.send({ message: err });
    });;
};

exports.podcastsShow = (req, res, next) => {
    res.render('./../views/podcasts/show', { title: '', authorized: true });
};

exports.podcastsNew = (req, res, next) => {
    res.render('./../views/podcasts/new', { title: 'New Podcast', authorized: true });
};

exports.podcastsCreate = (req, res, next) => {
    // Create form processing promise function
    var processForm = () => {
        // Instantiate multer storage
        const storage = multer.diskStorage({
            // Set file destination
            destination: function(req, file, cb) {
                cb(null, 'uploads/');
            },
            // By default, multer removes file extensions so let's add them back
            filename: function(req, file, cb) {
                cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
            }
        });
        // Instantiate upload form process object
        let formProcessor = multer({ storage: storage, fileFilter: helpers.fileFilter }).single('file');
        // Create form promise
        var formPromise = new Promise(function (resolve, reject) {
            formProcessor(req, res, function (err) {
                // Validate file upload
                if (req.fileValidationError) {
                    // Return error
                    reject(req.fileValidationError);
                } else if (!req.file) {
                    // Return error
                    reject('Please select the mp3 file to upload');
                } else if (err instanceof multer.MulterError) {
                    // Return error
                    reject('There was an error processing the file.');
                } else if (err) {
                    // Return error
                    reject('There was an error processing the file.');
                } else {
                    // Return success
                    resolve();
                }
            });
        });
        // Return form promise 
        return formPromise;
    }
    // Properties
    var title = null;
    var description = null;
    var keywords = null;
    var pubDate = null;
    var season = null;
    var explicit = null;
    let postSlug = null;
    var length = null;
    var lengthString = null;
    var s3URL = null;

    const unlink = util.promisify(fs.unlink);

    // Initiate form processing
    processForm()
    .then(s3.backupFile({
        Bucket: process.env.AWS_S3_RSS_BUCKET + '/backup', 
        CopySource: process.env.AWS_S3_RSS_BUCKET + '/' + resourceKey, 
        Key: resourceKey.split('.').join('-' + Date.now() + '.')
    }))
    .then(() => {
        console.log(' -- Uploading podcast file.');
        // Create file stream 
        var fileStream = fs.createReadStream(req.file.path);
        fileStream.on('error', function(err) {
            console.log('File Error', err);
        });
        // Submit to S3
        return s3.submitS3File({
            Bucket: process.env.AWS_S3_FILE_BUCKET + '/' + req.body.season, 
            Key: req.file.filename,
            Body: fileStream
        })
    })
    .then(() => {
        console.log(' -- Getting audion duration.');

        return getAudioDurationInSeconds(req.file.path)
    })
    .then((duration) => {
        console.log(' -- Publishing podcast feed.');
        // Set properties
        title = helpers.sanitize(req.body.title);
        description = helpers.sanitize(req.body.description);
        keywords = helpers.sanitize(req.body.keywords);
        pubDate = moment(req.body.pubDate);
        season = req.body.season;
        explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';
        postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        length = duration * 1000;
        lengthString = new Date(length).toISOString().substr(11, 8);
        s3URL = podcastURL + season + '/' + encodeURI(req.file.filename);
        // Create feed item
        feedItem = {
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
        // Publish feed update 
        return publishPodcastFeed(feedItem);
    })
    .then(() => {
        console.log(' -- Publishing podcast post.');
        var size = req.file.size / 1000000
        var futurePublish = pubDate.isAfter(moment());
        // Instantiate podcast post
        var podcastPost = {
            slug: postSlug,
            status: futurePublish ? 'future' : 'publish',
            title: title,
            content: description,
            author: 1,
            excerpt: description.length > 250 ? description.slice(0, 250) + '...' : description,
            comment_status: 'closed',
            meta: {
                audio_file: s3URL,
                date_recorded: pubDate.format("dd-mm-yyyy"),
                duration: lengthString,
                episode_type: 'audio',
                explicit: req.body.explicit,
                filesize: Math.trunc(size) + ' Mb',
                // itunes_episode_number: '9',
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
        return wp.publishPodcast(podcastPost, req.session.accessToken);
    })
    .then((response) => {
        // Respond to response
        if (helpers.isDefined(response)) {
            console.log(' -- Success.');

            res.status(200).send({ redirectTo: '/podcasts' });
        } else {
            console.log(' -- FAILURE.');
            // Return error 
            res.status(500).send({ message: 'There was an error posting the podcast post.' });
        }
    })
    .then(() => unlink(req.file.path))
    .catch((err) => {
        // Log error message
        console.log(err);
        // Delete file
        fs.unlink(req.file.path, () => {}); 
        // Return error 
        res.status(500).send({ message: err });
    });
};

var getPodcast = () => {
    return fetch(feedURL, { 
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36', 
        'accept': 'text/html,application/xhtml+xml' 
    })
    .then(response => response.text())
    .then(xml.parseData)
}

var parsePodcast = (result) => {
    return result.rss.channel[0].item.map(item => new Podcast(item));
}

var publishPodcastFeed = (podcast) => {
    // Get live data
    return getPodcast()
    .then(result => {
        // Append item
        result.rss.channel[0].item.push(podcast);
        // Submit to S3
        return s3.submitS3File({
            Bucket: process.env.AWS_S3_RSS_BUCKET, 
            Key: resourceKey.split('.').join('-test.'), // TODO: Remove this split code
            Body: xml.jsonToXML(result)
        })
    });
}