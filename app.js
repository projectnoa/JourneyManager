// app.js

/**
 * Required External Modules
 */

import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import express, { static as _static } from 'express';
import { join } from "path";

import passport from './auth.js';

import esession from 'cookie-session';
import cookieParser from 'cookie-parser';             // CSRF Cookie parsing

import bodyParser from 'body-parser';                     // CSRF Body parsing                  

import router from './routes/index.js';
import morgan from 'morgan';
import winston from './helpers/winston.js';
 
import { getDirName } from './helpers/helper.js';

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

app.use(function (req, res, next) {
  res.setHeader(
    'Content-Security-Policy-Report-Only', "default-src 'self'; script-src 'self' https://code.jquery.com/jquery-3.5.1.min.js https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.31/moment-timezone-with-data.js https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js; style-src 'self' https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css; font-src 'self' https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-brands-400.woff2 https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-brands-400.woff https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-brands-400.ttf https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-regular-400.woff2 https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-regular-400.woff https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-regular-400.ttf https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-solid-900.woff2 https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-solid-900.woff https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/webfonts/fa-solid-900.ttf; img-src 'self'; frame-src 'self'"
  );

  res.setHeader(
    'Strict-Transport-Security', 'max-age=31536000; includeSubDomains'
  );
  
  next();
});

app.use(esession({
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
app.use(morgan('combined', { stream: winston.stream }));

app.set("views", join(getDirName(import.meta.url), "views"));
app.set("view engine", "pug");

app.use(_static(join(getDirName(import.meta.url), "public")));

app.use('/', router);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // add this line to include winston logging
  winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * Routes Definitions
 */

router.get('/auth/wordpress', 
  passport.authorize('wordpress'));
  
router.get('/auth/wordpress/callback', 
  passport.authorize('wordpress', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/dashboard');
    delete req.session.returnTo;
});

export default app;