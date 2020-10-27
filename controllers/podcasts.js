// podcasts.js

/**
 * Required External Modules
 */

var fetch = require('node-fetch');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

var fs = require('fs');

const { getAudioDurationInSeconds } = require('get-audio-duration');

var dateFormat = require('dateformat');

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
    getPodcast(result => {
        res.render('./podcasts/index', { title: 'Podcasts', authorized: true, items: parsePodcast(result) }); 
    });
};

exports.podcastsShow = (req, res, next) => {
    res.render('./../views/podcasts/show', { title: '', authorized: true });
};

exports.podcastsNew = (req, res, next) => {
    res.render('./../views/podcasts/new', { title: 'New Podcast', authorized: true });
};

exports.podcastsCreate = (req, res, next) => {
    // Instantiate upload form process object
    let formProcessor = multer({ storage: storage, fileFilter: helpers.imageFilter }).single('file');
    // Initiate upload form process
    formProcessor(req, res, function(err) {
        // Validate file upload
        if (req.fileValidationError) {
            return res.redirect('back', { title: 'New Podcast', authorized: true, notice: req.fileValidationError });
        } else if (!req.file) {
            return res.redirect('back', { title: 'New Podcast', authorized: true, notice: 'Please select the mp3 file to upload' });
        } else if (err instanceof multer.MulterError) {
            return res.redirect('back', { title: 'New Podcast', authorized: true, notice: 'There was an error processing the file.' });
        } else if (err) {
            return res.redirect('back', { title: 'New Podcast', authorized: true, notice: 'There was an error processing the file.' });
        }
        // Backup info
        s3.backupFile({
            Bucket: process.env.AWS_S3_RSS_BUCKET + '/backup', 
            CopySource: process.env.AWS_S3_RSS_BUCKET + '/' + resourceKey + '/backup', 
            Key: resourceKey.split('.').join('-' + Date.now() + '.')
        }, (succeeded) => {
            if (succeeded) {
                // Get file duration 
                getAudioDurationInSeconds(req.file.path)
                .then((duration) => {
                    // Determine post url slug
                    let postSlug = encodeURI(req.body.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
                    // Create feed item
                    feedItem = {
                        title: [req.body.title],
                        'itunes:title': [req.body.title],
                        'link': [postURL + postSlug],
                        pubdate: [req.body.pubDate + ' PDT'],
                        description: [req.body.description], 
                        'enclosure': {
                            $: {
                                url: postURL + postSlug,
                                length: duration,
                                type: 'audio/mpeg'
                            }
                        },
                        guid: [podcastURL + req.body.season + '/' + encodeURI(req.file.filename) ],
                        'itunes:duration': duration,
                        'itunes:summary': [req.body.description],
                        'itunes:image': {
                            $: {
                                href: podcastImageURL
                            }
                        },
                        'itunes:keywords': [req.body.keywords], 
                        'itunes:explicit': [(req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no']
                    };
                    // console.log(duration);
                    uploadPodcastFile(req.file, req.body.season, (succeeded) => {
                        if (succeeded) {
                            publishPodcastFeed(feedItem, () => {
                                // Create podcast post
                                wp.addPodcast({
                                    date: dateFormat(req.body.pubDate, "yyyy/mm/dd HH:mm"),
                                    slug: postSlug,
                                    status: 'pending',
                                    title: req.body.title,
                                    content: req.body.description,
                                    author: 1,
                                    excerpt: req.body.description.length > 250 ? req.body.description.slice(0, 250) : req.body.description,
                                    comment_status: 'closed',
                                    meta: {},
                                    tags: 1
                                }, req.session.accessToken, (response) => {
                                    if (helpers.isDefined(response)) {
                                        return res.redirect('/podcasts');
                                    } else {
                                        return res.redirect('back', { title: 'New Podcast', authorized: true, notice: 'There was an error posting the podcast post.' });
                                    }
                                });
                            });
                        } else {
                            return res.redirect('back', { title: 'New Podcast', authorized: true, notice: 'There was an error uploading the file.' });
                        }
                    });
                });
            } else {
                return res.redirect('back', { title: 'New Podcast', authorized: true, notice: 'There was an error backing up the feed.' });
            }
        }); 
    });
};

var getPodcast = (callback) => {
    var req = fetch(feedURL, { 
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36', 
        'accept': 'text/html,application/xhtml+xml' 
    }).then(response => response.text())
    .then(data => {
        parseString(data, function(err, result) {
            if (err) console.log(err);
      
            callback(result);
          });
    });
}

var parsePodcast = (result) => {
    return result.rss.channel[0].item.map(item => new Podcast(item));
}

var uploadPodcastFile = (file, season, callback) => {
    var fileStream = fs.createReadStream(file);
    fileStream.on('error', function(err) {
        console.log('File Error', err);
    });
    // Submit to S3
    s3.submitS3File({
        Bucket: process.env.AWS_S3_FILE_BUCKET + '/' + season, 
        Key: file.originalname,
        Body: fileStream
    }, callback);
}

var publishPodcast = (podcast, callback) => {

}

var publishPodcastFeed = (podcast, callback) => {
    // Get live data
    getPodcast(result => {
        // Append item
        result.rss.channel[0].item.push(podcast);
        // Submit to S3
        s3.submitS3File({
            Bucket: process.env.AWS_S3_RSS_BUCKET, 
            Key: resourceKey.split('.').join('-test.'), // TODO: Remove this split code
            Body: xml.jsonToXML(result)
        }, callback);
    });
}