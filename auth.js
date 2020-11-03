// auth.js

/**
 * Required External Modules
 */

const passport = require('passport');
const passportStrategy = require('./auth-strategy');

/**
 *  App Configuration
 */

passport.serializeUser(function(user, cb) {
    cb(null, user);
});
  
passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

passport.use(new passportStrategy({
    clientID: process.env.WP_AUTH_ID,
    clientSecret: process.env.WP_AUTH_SEC,
    callbackURL: process.env.DOMAIN + '/auth/wordpress/callback',
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

module.exports = passport;