// auth.js

/**
 * Required External Modules
 */

import passport from 'passport';

import WordPressStrategy from './auth-strategy.js';

/**
 *  App Configuration
 */

passport.serializeUser(function(user, cb) {
    cb(null, user);
});
  
passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

passport.use(new WordPressStrategy({
    clientID: process.env.JM_WP_AUTH_ID,
    clientSecret: process.env.JM_WP_AUTH_SEC,
    callbackURL: process.env.JM_DOMAIN + '/auth/wordpress/callback',
    scope: ['profile'],
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    // store tokens in session
    req.session.accessToken = accessToken; 
    req.session.refreshToken = refreshToken;
    req.session.profile = profile;
    // Continue to router 
    return done(null, profile);
  }
));

export default passport;