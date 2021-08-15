// podcasts.js

/**
 * Required External Modules
 */

var moment = require('moment');

var Podcast = require('./../models/podcast');
var Feed = require('./../models/feed');

const fetcher = require('./../helpers/fetcher');

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
const podcastURL = 'https://s3.us-west-2.amazonaws.com/podcasts.ajourneyforwisdom.com/';
const podcastImageURL = podcastURL + 'images/DTMG-profile-v5.jpeg';

var feed_cache = null;

/**
 *  Methods
 */

exports.podcastsIndex = async (req, res) => {
    let page = req.query.page;

    if (page == undefined) page = 1;

    try {
        // Retrieve feed data
        let feed = await retrieve_feed(refresh_cookie(req));
        let last_podcasts = await wp.getPodcasts();
        // Parse posts
        winston.info(' -- Parsing items.');
        let items = parsePodcast(feed);
        let total = items.length;
        let pages = Math.ceil(total / 5);

        let index = 0;
        // Get newsletter data
        newsletter = items
            .filter(i => i.type.toLowerCase() === 'full')
            .slice(0, 2)
            .map(i => { 
                let item = { 
                    title: i.title, 
                    desc: helpers.stripHTML(i.description).substring(0, 250) + '...', 
                    url: i.postLink,
                    img: last_podcasts[index]._embedded['wp:featuredmedia'][0].source_url
                } 

                index += 1;

                return item;
            });
        // Paginate items
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
    let recording = req.query.recording;
    let location = req.query.location;
    let length = req.query.length;
    let duration = req.query.duration;
    let season = req.query.season;
    let episode = req.query.episode;

    res.render('./../views/podcasts/new', { 
        title: 'New Episode', 
        season: season, 
        episode: episode, 
        authorized: true,
        recording: recording,
        location: location,
        length: length,
        duration: duration
    });
};

exports.podcastsCreate = async (req, res) => {
    try {
        // Validate date data
        winston.info(' -- Parsing date data.');
        // Format Dates (Adjust to PDT)
        let pubDateStr = req.body.pubDate + ':00 PDT';
        let pubDateLocalStr = moment(pubDateStr).format('YYYY-MM-DTHH:mm:ss');
        // Backup feed
        let backupResponse = await backupFeed(res);
        // Validate backup response
        winston.info(' -- Validating backup.');
        if (helpers.isDefined(backupResponse) && backupResponse.$response.httpResponse.statusCode === 200) {
            // Create feed object
            let data = new Feed(req);
            // Create feed item 
            let feedItem = createFeedItem(data, pubDateStr);
            // Get live feed
            winston.info(' -- Getting live feed.');
            let feed = await retrieve_feed(true);
            // Append item to front
            winston.info(' -- Appending item.');
            feed.rss.channel.item.unshift(feedItem);
            // Update pubdate and lastbuilddate
            feed.rss.channel.pubDate = pubDateStr;
            feed.rss.channel.lastBuildDate = pubDateStr;
            // Update feed 
            let feedResponse = await updateFeed(feed);
            // Validate feed response
            winston.info(' -- Validating feed update.');
            if (helpers.isDefined(feedResponse)) {
                // Determine if post should be published
                let publish_post = req.body.post;
                // If a post is scheduled to be published 
                if (publish_post === 'true' || publish_post === 'on') {
                    let postItem = await createPostItem(req, feedItem, pubDateLocalStr);
                    // Publish podcast post
                    winston.info(' -- Publishing podcast post.');
                    let succeeded = await wp.publishPodcast(postItem, req.session.accessToken);
                    // Confirm if post was posted
                    if (helpers.isDefined(succeeded)) {
                        // Set notice
                        helpers.setNotice(res, 'Podcast episode published & posted!');
                        // Respond
                        winston.info(' -- Success.');
                        res.status(200).send({ redirectTo: '/podcasts' });
                    } else {
                        throw new Error('Post could not be published.');
                    }
                } else {
                    // Set notice
                    helpers.setNotice(res, 'Podcast episode published!');
                    // Respond
                    winston.info(' -- Success.');
                    res.status(200).send({ redirectTo: '/podcasts' });
                }
            } else {
                throw new Error('Feed could not be updated.');
            }
        } else {
            throw new Error('Feed could not be backed up.');
        }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
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
    try {
        // Backup feed
        let backupResponse = await backupFeed(res);
        // Validate backup response
        winston.info(' -- Validating backup.');
        if (helpers.isDefined(backupResponse) && backupResponse.$response.httpResponse.statusCode === 200) {
            // Validate form data
            winston.info(' -- Parsing form data.');
            // Create feed object
            let data = new Feed(req);
            // Get live feed
            winston.info(' -- Getting live feed.');
            let feed = await retrieve_feed(true);
            // Update feed items
            let updated_items = updateFeedItems(data, feed, req.body.id);
            // Apply update
            feed.rss.channel.item = updated_items;
            // Update feed
            let feedResponse = await updateFeed(feed);
            // Respond to response
            if (helpers.isDefined(feedResponse)) {
                // Set notice
                helpers.setNotice(res, 'Podcast episode updated!');
                // Respond
                winston.info(' -- Success.');
                res.status(200).send({ redirectTo: '/podcasts' });
            } else {
                throw new Error('Feed could not be updated.');
            }
        } else {
            throw new Error('Feed could not be backed up.');
        }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        helpers.setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Edit Podcast', authorized: true });
    }
};

var backupFeed = async (res) => {
    // Back up feed
    winston.info(' -- Backing up podcast feed.');
    let response = await s3.backupFile({
        Bucket: process.env.JM_AWS_S3_RSS_BUCKET + '/backup',
        CopySource: process.env.JM_AWS_S3_RSS_BUCKET + '/' + resourceKey,
        Key: resourceKey.split('.').join('-' + Date.now() + '.')
    });

    return response;
}

var createFeedItem = (data, pubDate) => {
    // Create feed item
    winston.info(' -- Creating feed item.');
    let item = {
        title: helpers.comply(data.title),
        'itunes:title': helpers.comply(data.title),
        'pubDate': [pubDate],
        'guid': {
            $: {
                'isPermaLink': 'true'
            },
            '_': data.location
        },
        'link': data.post_url,
        'itunes:image': {
            $: {
                href: podcastImageURL
            }
        },
        description: helpers.comply(data.description),
        'content:encoded': helpers.comply(data.description),
        'enclosure': {
            $: {
                url: data.track_location,
                length: Math.trunc(data.length),
                type: 'audio/mpeg'
            }
        },
        'itunes:duration': data.duration,
        'itunes:explicit': data.explicit,
        'itunes:keywords': data.keywords.map(keyword => helpers.comply(keyword)).join(', '),
        'itunes:season': data.season,
        'itunes:episode': data.episode,
        'itunes:episodeType': 'full',
        'itunes:author': 'A Journey for Wisdom'
    };

    return item;
}

var updateFeedItems = (data, feed, id) => {
    // Update feed item
    winston.info(' -- Updating feed item.');
    let updated_items = feed.rss.channel.item.map((item) => {
        if (new Podcast(item).id == id) {
            item['title'] = helpers.comply(data.title);
            item['description'] = helpers.comply(data.description);
            item['content:encoded'] = helpers.comply(data.description),
            item['itunes:keywords'] = data.keywords.map(keyword => helpers.comply(keyword)).join(', ');
            item['itunes:season'] = data.season;
            item['itunes:episode'] = data.episode;
            item['itunes:explicit'] = data.explicit;
            item['enclosure'] = {
                $: {
                    url: data.location,
                    length: Math.trunc(data.length),
                    type: 'audio/mpeg'
                }
            };
            item['itunes:duration'] = data.duration;
        }

        return item;
    });

    return updated_items;
}

var createPostItem = async (req, data, pubDate) => {
    // Get size
    let size = req.body.length / 1000000;
    // Publish podcast tags
    winston.info(' -- Publishing podcast tags');
    let tag_ids = [];
    // Create tags
    try {
        tag_ids = await createTags(data.tags, req.session.accessToken);
    } catch (error) {
        winston.warn(' -- Tags not posted.' + error.message);
    }
    // Create podcast post
    winston.info(' -- Creating podcast post');
    let description_clean = helpers.stripHTML(data.description);
    description_clean = description_clean.length > 250 ? description_clean.slice(0, 250) + '...' : description_clean;
    // Create post item
    let postItem = {
        slug: data.postSlug,
        status: 'future',
        title: data.title,
        content: data.description + helpers.podcastFooter(),
        author: req.session.profile.id,
        excerpt: description_clean,
        featured_media: 6121, /* PODCAST IMAGE ID */
        series: 61, /* PODCAST SERIES ID */
        comment_status: 'open',
        tags: tag_ids,
        date: pubDate,
        meta: {
            audio_file: data.location,
            date_recorded: moment().format("DD-MM-yyyy"),
            duration: data.duration,
            episode_type: 'audio',
            explicit: data.explicit,
            filesize: Math.trunc(size) + ' Mb',
            itunes_episode_number: data.episode,
            itunes_episode_type: 'full',
            itunes_season_number: data.season,
            itunes_title: data.title,
            cover_image_id: '6229'
        }
    }

    return postItem;
}

var updateFeed = async (feed) => {
    // Publish feed update
    winston.info(' -- Publishing feed updates.');
    let response = await s3.submitS3File({
        Bucket: process.env.JM_AWS_S3_RSS_BUCKET,
        Key: resourceKey,
        Body: xml.jsonToXML(feed),
        ACL: 'public-read',
        ContentType: 'application/rss+xml',
        ContentEncoding: 'UTF-8'
    });

    return response;
}

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
