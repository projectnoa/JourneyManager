// session.js

/**
 * Required External Modules
 */

import axios from 'axios';

/**
 *  Methods
 */

export function validateSession(req, res, next) {
    axios({
        method: 'post',
        url: process.env.JM_WP_ENDPOINT + '/oauth/introspection/',
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
        
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/wordpress');
    });
}