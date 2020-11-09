// app.js

/**
 * Required External Modules
 */

require("dotenv").config();

const express = require('express');
const path = require("path");
const passport = require('./auth');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const router = require('./routes/index');

/**
 * App Variables
 */

const app = express();

const cookieExpirationDate = new Date();
const cookieExpirationDays = 365;
cookieExpirationDate.setDate(cookieExpirationDate.getDate() + cookieExpirationDays);

/**
 *  App Configuration
 */

app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.JM_COOKIE_SECRET,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week,
        secure: false,
        httpOnly: true,
	    expires: cookieExpirationDate // use expires instead of maxAge
    }
  }));
app.use(cookieParser(process.env.JM_COOKIE_SECRET));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));

app.use('/', router);

/**
 * Routes Definitions
 */

router.get('/auth/wordpress', 
  passport.authorize('wordpress'));
 
router.get('/auth/wordpress/callback', 
  passport.authorize('wordpress', { failureRedirect: '/' }),
  function(req, res) {
    var account = req.account;

    res.redirect(req.session.returnTo || '/dashboard');
    delete req.session.returnTo;
});

module.exports = app;