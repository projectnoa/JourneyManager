// wordpress.js

/**
 * Required External Modules
 */

var WPAPI = require('wpapi');

/**
 * Variables 
 */

var wp = new WPAPI({ endpoint: process.env.JM_WP_ENDPOINT + '/wp-json' });
wp.podcasts = wp.registerRoute( 'wp/v2', 'podcast/(?P<id>)', {
    // Listing any of these parameters will assign the built-in
    // chaining method that handles the parameter:
    params: [ 'date', 'slug', 'status', 'title', 'content', 'author', 'excerpt', 'comment_status', 'meta', 'tags' ]
})

/**
 *  Methods
 */

exports.getPosts = (token, page=1) => {
    if (page == undefined) page = 1;

    // Get all posts
    return wp.posts()
    .perPage(5)
    .page(page)
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .get()
}

exports.publishPodcast = (item, token) => {
    // Publish podcast episode
    return wp.podcasts()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
}

exports.publishPostDraft = (item, token) => {
    // Publish post draft
    return wp.posts()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
}

exports.publishTag = (item, token) => {
    return wp.tags()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
}

exports.getTags = (names, token) => {
    return wp.tags()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .param('name', names)
}