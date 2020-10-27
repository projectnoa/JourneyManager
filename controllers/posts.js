// posts.js

/**
 * Required External Modules
 */

var Post = require('./../models/post');

const wordpress = require('./../helpers/wordpress');

/**
 *  Methods
 */

exports.postsIndex = (req, res, next) => {
  // Get posts
  wp.getPosts(req.session.accessToken, (data) => {
    if (data !== null) {
      let posts = data.map(item => new Post(0, item.title.rendered, item.content.rendered));

      res.render('./posts/index', { title: 'Posts', authorized: true, items: posts });
    } else {
      res.redirect('back', { authorized: true, notice: 'There was an error.' });
    }
  });
};