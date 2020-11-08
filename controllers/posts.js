// posts.js

/**
 * Required External Modules
 */

var moment = require('moment');

var Post = require('./../models/post');

const helpers = require('./../helpers/helper');
const wp = require('./../helpers/wordpress');
const upload = require('./../helpers/imageUpload');

/**
 *  Methods
 */

exports.postsIndex = async (req, res, next) => {
    try {
        // Get posts
        let result = await wp.getPosts(req.session.accessToken)

        let posts = result.map(item => new Post(0, item.title.rendered, item.content.rendered));

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
    try {
        // Process form data
        await upload(req, res);
        // Set properties
        var title = helpers.sanitize(req.body.title);
        var excerpt = helpers.sanitize(req.body.excerpt);
        var keywords = helpers.sanitize(req.body.keywords);
        let tags = keywords.split(',').map(tag => tag.trim());
        var postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        
        console.log(' -- Publishing podcast tags');

        let tag_ids = await createTags(tags, req.session.accessToken);

        // Instantiate podcast post
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

        console.log(' -- Publishing post draft.');

        // Create post draft
        let succeeded = await wp.publishPostDraft(post, req.session.accessToken);

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
        // Return error 
        res.status(500).send({ message: err.message });
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