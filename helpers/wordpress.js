// wordpress.js

/**
 * Required External Modules
 */

import WPAPI from 'wpapi';

/**
 * Variables 
 */

let wp = new WPAPI({ endpoint: process.env.JM_WP_ENDPOINT + '/wp-json' });
wp.podcasts = wp.registerRoute( 'wp/v2', 'podcast/(?P<id>)', {
    // Listing any of these parameters will assign the built-in
    // chaining method that handles the parameter:
    params: [ 'date', 'slug', 'status', 'title', 'content', 'author', 'excerpt', 'comment_status', 'meta', 'tags' ]
})

/**
 *  Methods
 */

export function getPosts(token, page=1) {
    if (page == undefined) page = 1;

    // Get all posts
    return wp.posts().embed()
    .perPage(9)
    .page(page)
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .get()
}

export function getPodcasts(token) {
    // Publish podcast episode
    return wp.podcasts().embed()
    .perPage(2)
    .page(1)
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .get()
}

export function publishPodcast(item, token) {
    // Publish podcast episode
    return wp.podcasts()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
}

export function publishPostDraft(item, token) {
    // Publish post draft
    return wp.posts()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
}

export function publishTag(item, token) {
    return wp.tags()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
}

export function getTags(names, token) {
    return wp.tags()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .param('search', names)
    .param('per_page', 10)
}

export function getAllTags(token) {
    return wp.tags()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .param('per_page', 100)
}