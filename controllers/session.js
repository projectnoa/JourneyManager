// session.js

/**
 * Required External Modules
 */

const axios = require('axios');

/**
 *  Methods
 */

exports.validateSession = (req, res, next) => {
    axios({
        method: 'post',
        url: process.env.WP_ENDPOINT + '/oauth/introspection/',
        data: { },
        headers: {
          Authorization: 'Bearer ' + req.session.accessToken
        }
      })
      .then(response => {
        next();
      })
      .catch(error => {
        console.log(error);
    
        // req.logout();
        // req.session.destroy(function (err) {
        //   res.redirect('/');
        // });
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/wordpress');
    });
};