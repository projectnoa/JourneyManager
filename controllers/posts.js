// posts.js

/**
 * Required External Modules
 */

var WPAPI = require('wpapi');

var Post = require('./../models/post');

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
      let posts = data.map(item => new Post(0, item.title.rendered, item.content.rendered));

      res.render('./posts/index', { title: 'Posts', authorized: true, items: posts });
    })
    .catch(function( err ) {
        // handle error
    });
};