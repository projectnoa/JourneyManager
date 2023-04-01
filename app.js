/**
 * Required External Modules
 */

import * as dotenv from 'dotenv';
import express, { static as _static } from 'express';
import { join } from "path";
import passport from './auth.js';
import esession from 'cookie-session';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import router from './routes/index.js';
import morgan from 'morgan';
import winston from './helpers/winston.js';
import { getDirName } from './helpers/helper.js';

dotenv.config();

/**
 * App Variables
 */

const app = express();
const cookieExpirationDate = createCookieExpirationDate();

/**
 *  App Configuration
 */

app.use(setSecurityHeaders);
app.use(setupSessionMiddleware());
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
app.use(errorHandler);

app.use('/favicon.ico', express.static('public/img/favicon.ico'));

/**
 * Routes Definitions
 */

router.get('/auth/wordpress', passport.authorize('wordpress'));
router.get('/auth/wordpress/callback', passport.authorize('wordpress', { failureRedirect: '/login' }), handleAuthCallback);

export default app;

function createCookieExpirationDate() {
  const date = new Date();
  const days = 365;
  date.setDate(date.getDate() + days);
  return date;
}

let cspJScripts = [
    "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.43/moment-timezone-with-data.js",
    "https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/js/bootstrap.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/axios/1.3.4/axios.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/dropzone.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/cropper/4.1.0/cropper.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jquery-cropper/1.0.1/jquery-cropper.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/downloadjs/1.4.8/download.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.39.0/js/tempusdominus-bootstrap-4.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.19.5/jquery.validate.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/Trumbowyg/2.27.3/trumbowyg.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tagify/4.17.7/tagify.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tagify/4.17.7/tagify.polyfills.min.js"
  ];

let cspStyles = [
    "https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/dropzone.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/cropper/4.1.0/cropper.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.39.0/css/tempusdominus-bootstrap-4.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/Trumbowyg/2.27.3/ui/trumbowyg.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/tagify/4.17.7/tagify.min.css"
  ];

let cspFonts = [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.ttf",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.ttf",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.ttf",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-v4compatibility.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-v4compatibility.ttf"
  ];

function setSecurityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy-Report-Only', 
    `default-src 'self'; script-src 'self' ${cspJScripts.join(" ")}; style-src 'self' 'unsafe-inline' ${cspStyles.join(" ")}; font-src 'self' ${cspFonts.join(" ")}; img-src 'self' data: https:; frame-src 'self'`);
  res.setHeader('Strict-Transport-Security', 
    'max-age=31536000; includeSubDomains');
  next();
}

function setupSessionMiddleware() {
  return esession({
    resave: true,
    saveUninitialized: true,
    secret: process.env.JM_COOKIE_SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week,
      secure: false,
      httpOnly: true,
      expires: cookieExpirationDate
    }
  });
}

function errorHandler(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  res.status(err.status || 500);
  res.render('error');
}

function handleAuthCallback(req, res) {
  res.redirect(req.session.returnTo || '/dashboard');
  delete req.session.returnTo;
}
