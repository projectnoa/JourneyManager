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

const podcastFilesFolder = '2021';

var feed_cache = null;

/**
 *  Methods
 */

exports.podcastsIndex = async (req, res) => {
    let page = req.query.page;

    if (page == undefined) page = 1;

    try {
        // Retrieve feed data
        let result = await retrieve_feed(refresh_cookie(req));

        // Parse posts
        winston.info(' -- Parsing items.');
        let items = parsePodcast(result);

        let total = items.length;
        let pages = Math.ceil(total / 5);

        newsletter = items.filter(i => i.type.toLowerCase() === 'full').slice(0, 2).map(i => { return { title: i.title, desc: helpers.stripHTML(i.description).substring(0, 250) + '...', url: i.postLink } });

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
            pages: pages,
            newsletter: newsletter
        });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Podcasts', authorized: true });
    }
};

exports.podcastsNew = async (req, res) => {
    let season_data = await retrieve_season_data(req);

    res.render('./../views/podcasts/new', { title: 'New Episode', season: season_data.season, episode: season_data.episode, authorized: true });
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
            return res.redirect('back', 500, { title: 'New Podcast', authorized: true });
        } else if (!req.file) {
            // Set notice
            helpers.setNotice(res, 'An error occured: No file provided');
            // Return error
            return res.redirect('back', 500, { title: 'New Podcast', authorized: true });
        }

        // Validate form data
        winston.info(' -- Parsing form data.');

        // Format Dates (Adjust to PDT)
        let pubDateObj = new Date(req.body.pubDate + ' PDT');
        
        let pubDate = moment(pubDateObj);
        let pubDateGMT = moment(pubDateObj.toLocaleString("en-US", { timeZone: "GMT" }));
        
        let pubDateStr = pubDate.format('ddd, D MMM YYYY HH:mm:ss ZZ');
        let pubDateShortStr = pubDate.format('YYYY-M-DTHH:mm:ss');
        let pubDateShortGMTStr = pubDateGMT.format('YYYY-M-DTHH:mm:ss');

        // return;

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
            return res.redirect('back', 500, { title: 'New Podcast', authorized: true });
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
            Bucket: process.env.JM_AWS_S3_FILE_BUCKET + '/' + podcastFilesFolder,
            Key: req.file.filename,
            Body: fileStream,
            ACL: 'public-read'
        });

        // Set properties
        let title = helpers.sanitize(req.body.title);
        let description = helpers.clearHTMLStyles(helpers.sanitize(req.body.description));
        description += helpers.clearHTMLStyles(helpers.sanitize(req.body.info));
        
        let tags = [];
        let keywords = [];

        try {
            tags = JSON.parse(req.body.keywords);    
            keywords = tags.map(tag => tag.value);
        } catch (err) {
            winston.warn(' -- Tags could not be processed.' + err.message);
        }
        
        let season = req.body.season;
        let episode = req.body.episode;
        let explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';
        let postSlug = encodeURI(req.body.posturl.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        let length = req.body.length;
        let size = length / 1000000;
        let duration = req.body.duration;
        let s3URL = uploadResponse.Location;
        let publish_post = req.body.post;
        let post_url = postURL + postSlug;

        // Create feed item
        winston.info(' -- Creating feed item.');
        let feedItem = {
            title: helpers.comply(title),
            'itunes:title': helpers.comply(title),
            'pubDate': [pubDateStr],
            'guid': {
                $: {
                    'isPermaLink': 'true'
                },
                '_': s3URL
            },
            'link': post_url,
            'itunes:image': {
                $: {
                    href: podcastImageURL
                }
            },
            description: helpers.comply(description),
            'content:encoded': helpers.comply(description),
            'enclosure': {
                $: {
                    url: s3URL,
                    length: Math.trunc(length),
                    type: 'audio/mpeg'
                }
            },
            'itunes:duration': duration,
            'itunes:explicit': explicit,
            'itunes:keywords': helpers.comply(keywords),
            'itunes:season': season,
            'itunes:episode': episode,
            'itunes:episodeType': 'Full',
            'itunes:author': 'A Journey for Wisdom'
        };

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await retrieve_feed(true);

        // Append item to front
        winston.info(' -- Appending item.');
        result.rss.channel.item.unshift(feedItem);

        // Update pubdate and lastbuilddate
        result.rss.channel.pubDate = pubDateStr;
        result.rss.channel.lastBuildDate = pubDateStr;

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

        if (publish_post === 'true' || publish_post === 'on') {
            // Publish podcast tags
            winston.info(' -- Publishing podcast tags');

            let tag_ids = [];

            try {
                tag_ids = await createTags(tags, req.session.accessToken);
            } catch (error) {
                winston.warn(' -- Tags not posted.' + error.message);
            }

            // Create podcast post
            winston.info(' -- Creating podcast post');
            let description_clean = helpers.stripHTML(description);

            // Instantiate podcast post
            let podcastPost = {
                slug: postSlug,
                status: 'future',
                title: title,
                content: description + helpers.podcastFooter(),
                author: req.session.profile.id,
                excerpt: description_clean.length > 250 ? description_clean.slice(0, 250) + '...' : description_clean,
                featured_media: 6121, /* PODCAST IMAGE ID */
                series: 61, /* PODCAST SERIES ID */
                comment_status: 'open',
                tags: tag_ids,
                date: pubDateShortStr,
                date_gmt: pubDateShortGMTStr,
                meta: {
                    audio_file: s3URL,
                    date_recorded: pubDate.format("DD-MM-yyyy"),
                    duration: duration,
                    episode_type: 'audio',
                    explicit: explicit,
                    filesize: Math.trunc(size) + ' Mb',
                    itunes_episode_number: episode,
                    itunes_episode_type: 'full',
                    itunes_season_number: season,
                    itunes_title: title,
                    cover_image_id: 6229
                }
            }

            // Publish podcast post
            winston.info(' -- Publishing podcast post.');
            let succeeded = await wp.publishPodcast(podcastPost, req.session.accessToken);

            // Respond to response
            if (helpers.isDefined(succeeded)) {
                // Set notice
                helpers.setNotice(res, 'Podcast episode published & posted!');
                // Respond
                winston.info(' -- Success.');
                res.status(200).send({ redirectTo: '/podcasts' });
            } else {
                // Set notice
                helpers.setNotice(res, 'There was an error posting the podcast episode.');
                // Return error
                winston.warn(' -- FAILURE.');
                res.redirect('back', 500, { title: 'New Podcast', authorized: true });
            }
        } else {
            // Set notice
            helpers.setNotice(res, 'Podcast episode published!');
            // Respond
            winston.info(' -- Success.');
            res.status(200).send({ redirectTo: '/podcasts' });
        }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) await unlink(req.file.path);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'New Podcast', authorized: true });
    }
};

exports.podcastsEdit = async (req, res) => {
  let id = req.body.id;

  try {
      // Get live feed
      winston.info(' -- Getting live feed.');
      let result = await retrieve_feed(true);

      // Parse posts
      winston.info(' -- Parsing items.');
      let items = parsePodcast(result);

      // Render page
      winston.info(' -- Rendering page.');
      res.render('./podcasts/edit', {
          title: 'Edit episode',
          authorized: true,
          item: items.find(i => i.id == id),
          entity: 'podcast'
      });
  } catch (err) {
      // Log error message
      winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      helpers.setNotice(res, `An error occured: ${err.message}`);
      // Return error
      res.redirect('back', 500, { title: 'Edit episode', authorized: true });
  }
};

exports.podcastsUpdate = async (req, res) => {
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
            return res.redirect('back', 500, { title: 'Edit Podcast', authorized: true });
        } else if (req.file) {
            fileDeleted = false;
        }

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
            return res.redirect('back', 500, { title: 'Edit Podcast', authorized: true });
        }

        let length = null;
        let duration = null;
        let s3URL = null;

        if (!fileDeleted) {
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
                ACL: 'public-read'
            });

            length = req.body.length;
            duration = req.body.duration;
            s3URL = uploadResponse.Location;

            // Delete file
            winston.info(' -- Deleting temp file.');
            await unlink(req.file.path);

            fileDeleted = true;
        }

        // Validate form data
        winston.info(' -- Parsing form data.');

        // Set properties
        let title = helpers.sanitize(req.body.title);
        let description = helpers.clearHTMLStyles(helpers.sanitize(req.body.description));
        
        let tags = [];
        let keywords = [];

        try {
            tags = JSON.parse(req.body.keywords);    
            keywords = tags.map(tag => tag.value);
        } catch (err) {
            winston.warn(' -- Tags could not be processed.' + err.message);
        }

        let season = req.body.season;
        let episode = req.body.episode;
        let explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';

        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await retrieve_feed(true);

        // Update feed item
        winston.info(' -- Updating feed item.');
        let updated_items = 
            result.rss.channel.item.map((item) => {
                if (new Podcast(item).id == req.body.id) {
                    item['title'] = helpers.comply(title);
                    item['description'] = helpers.comply(description);
                    item['content:encoded'] = helpers.comply(description),
                    item['itunes:keywords'] = helpers.comply(keywords);
                    item['itunes:season'] = season;
                    item['itunes:episode'] = episode;
                    item['itunes:explicit'] = explicit;

                    if (!fileDeleted) {
                        item['enclosure'] = {
                            $: {
                                url: s3URL,
                                length: Math.trunc(length),
                                type: 'audio/mpeg'
                            }
                        };
                        item['itunes:duration'] = duration;
                    }
                }

                return item;
            });
        
        result.rss.channel.item = updated_items;

        // Publish feed update
        winston.info(' -- Publishing feed updates.');
        let feedResponse = await s3.submitS3File({
            Bucket: process.env.JM_AWS_S3_RSS_BUCKET,
            Key: resourceKey,
            Body: xml.jsonToXML(result),
            ACL: 'public-read'
        });

        // Respond to response
        if (helpers.isDefined(feedResponse)) {
            // Set notice
            helpers.setNotice(res, 'Podcast episode updated!');
            // Respond
            winston.info(' -- Success.');
            res.status(200).send({ redirectTo: '/podcasts' });
        } else {
            // Set notice
            helpers.setNotice(res, 'There was an error updating the podcast episode.');
            // Return error
            winston.warn(' -- FAILURE.');
            res.redirect('back', 500, { title: 'Edit Podcast', authorized: true });
        }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Delete file
        if (!fileDeleted) await unlink(req.file.path);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Edit Podcast', authorized: true });
    }
};

var parsePodcast = (result) => {
    return result.rss.channel.item.map(item => new Podcast(item));
}

var createTags = async (tags, token) => {
    let tag_ids = [];

    for (let index = 0; index < tags.length; index++) {
        try {
            let tag = tags[index];

            if (tag.id !== undefined) {
                tag_ids.push(tag.id);
            } else {
                let tag_data = await wp.publishTag({ 'name': tag.value } , token);

                if (tag_data.id !== undefined) {
                    tag_ids.push(tag_data.id);
                } else {
                    tag_ids.push(tag_data);
                }
            }
        } catch (err) {
            if (err.data !== undefined && err.data.term_id !== undefined) tag_ids.push(err.data.term_id);
            
            winston.warn(' -- Tags could not be created. ' + err.message);
        }
    }

    return tag_ids;
}

var refresh_cookie = (req) => {
    return req.cookies['_JourneyManager_fresh'] === 'true';
}

var retrieve_feed = async (fresh=false) => {
    // If fresh feed requested or no cache
    if (fresh === 'true' || fresh === true || !helpers.isDefined(feed_cache)) {
        // Get live feed
        winston.info(' -- Getting live feed.');
        feed_cache = await fetcher(feedURL);
    }
    // Return feed data 
    return feed_cache;
}

var retrieve_season_data = async (req) => {
    try {
        // Retrieve feed data
        let result = await retrieve_feed(refresh_cookie(req));

        let items = result.rss.channel.item;

        let current_season = Math.max.apply(Math, items.map(x => parseInt(x['itunes:season'])).filter(Number));
        let current_episode = Math.max.apply(Math, items.filter(x => parseInt(x['itunes:season']) == current_season && helpers.isStrEq(x['itunes:episodeType'], 'full')).map(x => parseInt(x['itunes:episode'])).filter(Number));

        return { season: current_season, episode: current_episode + 1 }
    } catch (err) {
        return { season: 1, episode: 1 }
    }
}
