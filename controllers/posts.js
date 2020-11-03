// posts.js

/**
 * Required External Modules
 */

const util = require('util');

var fs = require('fs');

var moment = require('moment');

var Post = require('./../models/post');

const helpers = require('./../helpers/helper');
const fetcher = require('./../helpers/fetcher');
const s3 = require('./../helpers/s3');
const wp = require('./../helpers/wordpress');
const upload = require('./../helpers/imageUpload');

/**
 * Variables
 */



/**
 *  Methods
 */

exports.postsIndex = async (req, res, next) => {
    try {
        // Get posts
        let result = await wp.getPosts(req.session.accessToken)

        let posts = result.map(item => new Post(0, item.title.rendered, item.content.rendered)).reverse();

        res.render('./posts/index', { title: 'Posts', authorized: true, items: posts });
    } catch (err) {
        // Log error message
        console.log(err);
        // Return error 
        res.send({ message: err.message });
    }
};

exports.postsNew = (req, res, next) => {
  res.render('./../views/posts/new', { title: 'New Post Draft', authorized: true });
};

exports.postsCreate = async (req, res, next) => {
    const unlink = util.promisify(fs.unlink);

    try {
        // Process form data
        await upload(req, res);
        // console.log(req.files);

        console.log(' -- Publishing podcast feed.');
        // Set properties
        var title = helpers.sanitize(req.body.title);
        var description = '';
        var excerpt = helpers.sanitize(req.body.excerpt);
        var keywords = helpers.sanitize(req.body.keywords);
        var postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        
        // Instantiate podcast post
        var post = {
            slug: postSlug,
            status: 'draft',
            title: title,
            content: description,
            author: req.session.userId,
            excerpt: excerpt,
            comment_status: 'closed'
        }
        // Create post draft
        let succeeded = await wp.publishPostDraft(post, req.session.accessToken);

        // Delete file
        if (req.file) await unlink(req.file.path);

        // Respond to response
        if (helpers.isDefined(succeeded)) {
            console.log(' -- Success.');

            res.status(200).send({ redirectTo: '/posts' });
        } else {
            console.log(' -- FAILURE.');
            // Return error 
            res.status(500).send({ message: 'There was an error creating the draft.' });
        }
    } catch (err) {
        // Log error message
        console.log(err);
        // Delete file
        if (req.file) await unlink(req.file.path);
        // Return error 
        res.status(500).send({ message: err.message });
    }
};