// podcasts.js

/**
 * Required External Modules
 */

import moment from 'moment';

import Podcast from './../models/podcast.js';
import Feed from './../models/feed.js';

import fetcher from './../helpers/fetcher.js';

import { info, error as _error, warn } from './../helpers/winston.js';

import { stripHTML, setNotice, isDefined, comply, podcastFooter } from './../helpers/helper.js';
import { backupFile, submitS3File } from './../helpers/s3.js';
import { jsonToXML } from './../helpers/xml.js';
import { getPodcasts, publishPodcast, publishTag } from './../helpers/wordpress.js';

import * as constants from './../helpers/constants.js';

/**
 * Variables
 */

let feed_cache = null;

/**
 *  Methods
 */

export async function podcastsIndex(req, res) {
    let page = req.query.page;

    if (page == undefined) page = 1;

    try {
        // Retrieve feed data
        let feed = await retrieve_feed(refresh_cookie(req));
        let last_podcasts = await getPodcasts();
        // Parse posts
        info(' -- Parsing items.');
        let items = parsePodcast(feed);
        let total = items.length;
        let pages = Math.ceil(total / 5);

        let index = 0;
        // Get newsletter data
        let newsletter = items
            .filter(i => i.type.toLowerCase() === 'full')
            .slice(0, 2)
            .map(i => { 
                let item = { 
                    title: i.title, 
                    desc: stripHTML(i.description).substring(0, 250) + '...', 
                    url: i.postLink,
                    img: last_podcasts[index]._embedded['wp:featuredmedia'][0].source_url
                } 

                index += 1;

                return item;
            });
        // Paginate items
        items = items.slice((page - 1) * 5, page * 5);
        // Render page
        info(' -- Rendering page.');
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
        _error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Podcasts', authorized: true });
    }
}

export async function podcastsNew(req, res) {
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
}

export async function podcastsCreate(req, res) {
    try {
      // Validate date data
      info(' -- Parsing date data.');
      // Format Dates
      const pubDateStr = `${req.body.pubDate}:00`;
      const pubDateStandardStr = moment(pubDateStr).format('YYYY-MM-DDTHH:mm:ss');
  
      const backupResponse = await backupFeed(res);

      if (!isDefined(backupResponse) || backupResponse.$metadata.httpStatusCode !== 200) {
        throw new Error('Feed could not be backed up.');
      }
  
      const data = new Feed(req);
      const feedItem = createFeedItem(data, pubDateStr);
      const feed = await retrieve_feed(true);
  
      feed.rss.channel.item.unshift(feedItem);
      feed.rss.channel.pubDate = pubDateStr;
      feed.rss.channel.lastBuildDate = pubDateStr;
  
      const feedResponse = await updateFeed(feed);
  
      if (!isDefined(feedResponse) || feedResponse.$metadata.httpStatusCode !== 200) {
        throw new Error('Feed could not be updated.');
      }
  
      const publishPost = req.body.post;
      const shouldPublishPost = publishPost === 'true' || publishPost === 'on';
  
      if (shouldPublishPost) {
        const postItem = await createPostItem(req, data, pubDateStandardStr);
        info(' -- Publishing podcast post.');
  
        const succeeded = await publishPodcast(postItem, req.session.accessToken);
  
        if (!isDefined(succeeded)) {
          throw new Error('Post could not be published.');
        }
  
        setNotice(res, 'Podcast episode published & posted!');
      } else {
        setNotice(res, 'Podcast episode published!');
      }
  
      info(' -- Success.');
      res.status(200).send({ redirectTo: '/podcasts' });
    } catch (err) {
      _error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      setNotice(res, `An error occurred: ${err.message}`);
      res.redirect('back', 500, { title: 'New Podcast', authorized: true });
    }
}

export async function podcastsEdit(req, res) {
  let id = req.body.id;

  try {
      // Get live feed
      info(' -- Getting live feed.');
      let result = await retrieve_feed(true);
      // Parse posts
      info(' -- Parsing items.');
      let items = parsePodcast(result);

      let item = items.find(i => i.id == id);

      let recording = item.title;
      let location = item.url;
      let length = item.length;
      let duration = item.duration;
      let season = item.season;
      let episode = item.episode;
      // Render page
      info(' -- Rendering page.');
      res.render('./podcasts/edit', {
          title: 'Edit episode',
          item: items.find(i => i.id == id),
          entity: 'podcast',
          season: season, 
          episode: episode, 
          authorized: true,
          recording: recording,
          location: location,
          length: length,
          duration: duration
      });
  } catch (err) {
      // Log error message
      _error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      // Set notice
      setNotice(res, `An error occured: ${err.message}`);
      // Return error
      res.redirect('back', 500, { title: 'Edit episode', authorized: true });
  }
}

export async function podcastsUpdate(req, res) {
    try {
        // Backup feed
        let backupResponse = await backupFeed(res);
        // Validate backup response
        info(' -- Validating backup.');
        if (isDefined(backupResponse) && backupResponse.$metadata.httpStatusCode === 200) {
            // Validate form data
            info(' -- Parsing form data.');
            // Create feed object
            let data = new Feed(req);
            // Get live feed
            info(' -- Getting live feed.');
            let feed = await retrieve_feed(true);
            // Update feed items
            let updated_items = updateFeedItems(data, feed, req.body.id);
            // Apply update
            feed.rss.channel.item = updated_items;
            // Update feed
            let feedResponse = await updateFeed(feed);
            // Respond to response
            if (isDefined(feedResponse) && feedResponse.$metadata.httpStatusCode === 200) {
                // Set notice
                setNotice(res, 'Podcast episode updated!');
                // Respond
                info(' -- Success.');
                res.status(200).send({ redirectTo: '/podcasts' });
            } else {
                throw new Error('Feed could not be updated.');
            }
        } else {
            throw new Error('Feed could not be backed up.');
        }
    } catch (err) {
        // Log error message
        _error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Edit Podcast', authorized: true });
    }
}

let backupFeed = async (res) => {
    // Back up feed
    info(' -- Backing up podcast feed.');
    let response = await backupFile({
        CopySource: `${constants.RSS_S3_BUCKET}/${constants.RSS_S3_FOLDER}/${constants.FEED_XML}`,
        Bucket: `${constants.RSS_S3_BUCKET}`,
        Key: `${constants.RSS_S3_FOLDER}/${constants.BACKUP_S3_FOLDER}/${constants.FEED_XML.split('.').join('-' + Date.now() + '.')}`
    });

    return response;
}

let createFeedItem = (data, pubDate) => {
    // Create feed item
    info(' -- Creating feed item.');
    let item = {
        title: comply(data.title),
        'itunes:title': comply(data.title),
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
                href: constants.LOGO_IMAGE_URL
            }
        },
        description: comply(data.description),
        'content:encoded': comply(data.description),
        'enclosure': {
            $: {
                url: data.track_location,
                length: Math.trunc(data.length),
                type: 'audio/mpeg'
            }
        },
        'itunes:duration': data.duration,
        'itunes:explicit': data.explicit,
        'itunes:keywords': data.keywords.map(keyword => comply(keyword)).join(', '),
        'itunes:season': data.season,
        'itunes:episode': data.episode,
        'itunes:episodeType': 'full',
        'itunes:author': 'A Journey for Wisdom'
    };

    return item;
}

let updateFeedItems = (data, feed, id) => {
    // Update feed item
    info(' -- Updating feed item.');
    let updated_items = feed.rss.channel.item.map((item) => {
        if (new Podcast(item).id == id) {
            item['title'] = comply(data.title);
            item['description'] = comply(data.description);
            item['content:encoded'] = comply(data.description);
            item['itunes:keywords'] = data.keywords.map(keyword => comply(keyword)).join(', ');
            item['itunes:season'] = data.season;
            item['itunes:episode'] = data.episode;
            item['itunes:explicit'] = data.explicit;
            item['enclosure'] = {
                $: {
                    url: data.track_location,
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

let createPostItem = async (req, data, pubDate) => {
    // Get size
    let size = req.body.length / 1000000;
    // Publish podcast tags
    info(' -- Publishing podcast tags');
    let tag_ids = [];
    // Create tags
    try {
        tag_ids = await createTags(data.tags, req.session.accessToken);
    } catch (error) {
        warn(' -- Tags not posted.' + error.message);
    }
    // Create podcast post
    info(' -- Creating podcast post');
    let description_clean = stripHTML(data.description);
    description_clean = description_clean.length > 250 ? description_clean.slice(0, 250) + '...' : description_clean;
    // Create post item
    let postItem = {
        slug: data.postSlug,
        status: 'future',
        title: data.title,
        content: data.description + podcastFooter(),
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
            duration: new Date(parseInt(data.duration) * 1000).toISOString().split("T")[1].split(".")[0].replace("00:", ""),
            episode_type: "audio",
            explicit: data.explicit === 'yes' ? "true" : "false",
            filesize: Math.trunc(size) + " Mb",
            itunes_episode_number: data.episode,
            itunes_episode_type: "full",
            itunes_season_number: data.season,
            itunes_title: data.title,
            cover_image_id: "7406"
        }
    }

    return postItem;
}

let updateFeed = async (feed) => {
    // Publish feed update
    info(' -- Publishing feed updates.');
    return await submitS3File({
        Bucket: `${constants.RSS_S3_BUCKET}`,
        Key: `${constants.RSS_S3_FOLDER}/${constants.FEED_XML}`,
        Body: jsonToXML(feed),
        ACL: 'public-read',
        ContentType: 'application/rss+xml',
        ContentEncoding: 'UTF-8'
    });
}

let parsePodcast = (result) => {
    return result.rss.channel.item.map(item => new Podcast(item));
}

let createTags = async (tags, token) => {
    let tag_ids = [];

    for (const element of tags) {
        try {
            let tag = element;

            if (tag.id !== undefined) {
                tag_ids.push(tag.id);
            } else {
                let tag_data = await publishTag({ 'name': tag.value } , token);

                if (tag_data.id !== undefined) {
                    tag_ids.push(tag_data.id);
                } else {
                    tag_ids.push(tag_data);
                }
            }
        } catch (err) {
            if (err.data !== undefined && err.data.term_id !== undefined) tag_ids.push(err.data.term_id);
            
            warn(' -- Tags could not be created. ' + err.message);
        }
    }

    return tag_ids;
}

let refresh_cookie = (req) => {
    return req.cookies[constants.REFRESH_COOKIE] === 'true';
}

let retrieve_feed = async (fresh=false) => {
    // If fresh feed requested or no cache
    if (fresh == 'true' || fresh === true || !isDefined(feed_cache)) {
        // Get live feed
        info(' -- Getting live feed.');
        feed_cache = await fetcher(constants.FEED_XML_URL);
    }
    // Return feed data 
    return feed_cache;
}
