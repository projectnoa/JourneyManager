// posts.js

/**
 * Required External Modules
 */

import Post from './../models/post.js';

import requestProcessor from './../helpers/imageUpload.js';

import { info, error, warn } from './../helpers/winston.js';

import { setNotice, sanitize, postFooter, isDefined } from './../helpers/helper.js';
import { getPosts, publishPostDraft, getTags, publishTag } from './../helpers/wordpress.js';

/**
 *  Methods
 */

export async function postsIndex(req, res) {
    let page = req.query.page;

    if (page == undefined) page = 1;

    try {
        // Get live feed
        info(' -- Getting live feed.');
        let result = await getPosts(req.session.accessToken, page)

        // Parse posts
        info(' -- Parsing items.');
        let items = result.map(item => new Post(item));

        // Render page
        info(' -- Rendering page.');
        res.render('./posts/index', { 
            title: 'Posts', 
            authorized: true, 
            items: items,
            entity: 'posts',
            page: parseInt(page), 
            total: parseInt(result._paging.total), 
            pages: parseInt(result._paging.totalPages) 
        });
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'Posts', authorized: true });
    }
}

export function postsNew(req, res) {
    res.render('./../views/posts/new', { title: 'New Post Draft', authorized: true });
}

export async function postsCreate(req, res) {
    try {
        // Process request
        info(' -- Processing request.');
        await requestProcessor(req, res);

        // Validate form data
        info(' -- Parsing form data.');

        // Set properties
        let title = sanitize(req.body.title);
        let excerpt = sanitize(req.body.excerpt);
        let keywords = sanitize(req.body.keywords);
        let tags = keywords.split(',').map(tag => tag.trim());
        let postSlug = encodeURI(title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
        
        // Publish tags
        info(' -- Publishing tags');
        let tag_ids = await createTags(tags, req.session.accessToken);

        // Create post
        info(' -- Creating post');
        let post = {
            slug: postSlug,
            status: 'draft',
            title: title,
            content: postFooter(),
            author: req.session.userId,
            excerpt: excerpt,
            comment_status: 'closed',
            tags: tag_ids
        }

        // Publish post draft
        info(' -- Publishing post draft.');
        let succeeded = await publishPostDraft(post, req.session.accessToken);

        // Respond to response
        if (isDefined(succeeded)) {
            // Set notice
            setNotice(res, 'The post draft has been created.');
            // Respond
            info(' -- Success.');
            res.status(200).send({ redirectTo: '/posts' });
        } else {
            // Set notice
            setNotice(res, 'There was an error creating the post draft.');
            // Return error 
            warn(' -- FAILURE.');
            res.redirect('back', 500, { title: 'New Post Draft', authorized: true });
        }
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
        // Return error
        res.redirect('back', 500, { title: 'New Post Draft', authorized: true });
    }
}

export async function tagsSearch(req, res) {
    let term = req.query.term;

    try {
        // Get tags
        info(' -- Getting tags.');
        let result = await getTags(term, req.session.accessToken);

        // Parse tags
        info(' -- Parsing items.');
        let items = result.map(item => ({ id: item.id, value: item.name}));

        // Prepare response
        info(' -- Preparing response.');

        res.json(items);
    } catch (err) {
        // Log error message
        error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        // Set notice
        setNotice(res, `An error occured: ${err.message}`);
    }
}

let createTags = async (tags, token) => {
    let tag_ids = [];

    for (const element of tags) {  
        try {
            let tag_data = await publishTag({ 'name': element }, token);

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