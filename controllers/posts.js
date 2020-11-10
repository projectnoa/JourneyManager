// posts.js

/**
 * Required External Modules
 */

var moment = require('moment');

var Post = require('./../models/post');

const requestProcessor = require('./../helpers/imageUpload');

const winston = require('./../helpers/winston');

const helpers = require('./../helpers/helper');
const wp = require('./../helpers/wordpress');

/**
 *  Methods
 */

exports.postsIndex = async (req, res) => {
    try {
        // Get live feed
        winston.info(' -- Getting live feed.');
        let result = await wp.getPosts(req.session.accessToken)

        // Parse posts
        winston.info(' -- Parsing items.');
        let posts = result.map(item => new Post(0, item.title.rendered, item.content.rendered));

        // Render page
        winston.info(' -- Rendering page.');
        res.render('./posts/index', { title: 'Posts', authorized: true, items: posts });
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
};

exports.postsNew = (req, res) => {
    res.render('./../views/posts/new', { title: 'New Post Draft', authorized: true });
};

exports.postsCreate = async (req, res) => {
    try {
        // Process request
        winston.info(' -- Processing request.');
        await requestProcessor(req, res);

        // Validate form data
        winston.info(' -- Parsing form data.');

        // Set properties
        var title = helpers.sanitize(req.body.title);
        var excerpt = helpers.sanitize(req.body.excerpt);
        var keywords = helpers.sanitize(req.body.keywords);
        let tags = keywords.split(',').map(tag => tag.trim());
        var postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        
        // Publish tags
        winston.info(' -- Publishing tags');
        let tag_ids = await createTags(tags, req.session.accessToken);

        // Create post
        winston.info(' -- Creating post');
        var post = {
            slug: postSlug,
            status: 'draft',
            title: title,
            content: helpers.postFooter(),
            author: req.session.userId,
            excerpt: excerpt,
            comment_status: 'closed',
            tags: tag_ids
        }

        // Publish post draft
        winston.info(' -- Publishing post draft.');
        let succeeded = await wp.publishPostDraft(post, req.session.accessToken);

        // Respond to response
        if (helpers.isDefined(succeeded)) {
            // Respond
            winston.info(' -- Success.');
            res.status(200).send({ redirectTo: '/posts' });
        } else {
            // Return error 
            winston.warn(' -- FAILURE.');
            res.status(500).send({ message: 'There was an error creating the draft.' });
        }
    } catch (err) {
        // Log error message
        winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Return error 
        res.status(500).send({ message: `An error occured: ${err.message}` });
    }
};

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