// wordpress.js

/**
 * Required External Modules
 */

var WPAPI = require('wpapi');

/**
 * Variables 
 */

var wp = new WPAPI({ endpoint: process.env.WP_ENDPOINT + '/wp-json' });
wp.podcasts = wp.registerRoute( 'wp/v2', 'podcast/(?P<id>)', {
    // Listing any of these parameters will assign the built-in
    // chaining method that handles the parameter:
    params: [ 'date', 'slug', 'status', 'title', 'content', 'author', 'excerpt', 'comment_status', 'meta', 'tags' ]
})

/**
 *  Methods
 */

exports.getPosts = (token, callback) => {
    // Get all posts
    wp.posts()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .get()
    .then(function( data ) {
        callback(data);
    })
    .catch(function( err ) {
        console.log(err);
        // handle error
        callback(null);
    });
}

exports.publishPodcast = (item, token, callback) => {
    // Publish podcast episode
    wp.podcasts()
    .setHeaders( 'Authorization', 'Bearer ' + token )
    .create(item)
    .then(function( response ) {
        callback(response);
    })
    .catch(function( err ) {
        console.log(err);
        // handle error
        callback(null);
    });
}