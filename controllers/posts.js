// posts.js

/**
 * Required External Modules
 */

var WPAPI = require('wpapi');

/**
 * Variables 
 */

var wp = new WPAPI({ 
  endpoint: process.env.WP_ENDPOINT + '/wp-json'
});

/**
 *  Methods
 */

exports.postsIndex = (req, res, next) => {
    // Set access token on API library
    wp.posts()
    .setHeaders( 'Authorization', 'Bearer ' + req.session.accessToken )
    .get()
    .then(function( data ) {
      res.render('./posts/index', { title: 'Posts', authorized: true, items: data });
    })
    .catch(function( err ) {
        // handle error
    });
};