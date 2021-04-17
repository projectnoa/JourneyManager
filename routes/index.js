// index.js

/**
 * Required External Modules
 */

const express = require('express');

// Controllers
const sessionController = require('./../controllers/session');
const postsController = require('./../controllers/posts');
const podcastsController = require('./../controllers/podcasts');
const tweetsController = require('./../controllers/tweets');
const imagesController = require('./../controllers/images');

/**
 * App Variables
 */

const router = express.Router();

/**
 * Routes Definitions
 */

// Home
router.get('/', (req, res) => {
  res.render('home', { title: 'Home', authorized: false });
});

// Dashboard
router.get('/dashboard', sessionController.validateSession, (req, res) => {
  res.render('dashboard', { title: 'Dashboard', authorized: true });
});

// Posts
router.get('/posts', sessionController.validateSession, postsController.postsIndex);
router.get('/posts/new', sessionController.validateSession, postsController.postsNew);
router.post('/posts/create', sessionController.validateSession, postsController.postsCreate);

// Podcasts
router.get('/podcasts', sessionController.validateSession, podcastsController.podcastsIndex);
router.get('/podcasts/new', sessionController.validateSession, podcastsController.podcastsNew);
router.post('/podcasts/create', sessionController.validateSession, podcastsController.podcastsCreate);
router.post('/podcasts/:id/edit', sessionController.validateSession, podcastsController.podcastsEdit);
router.post('/podcasts/:id/update', sessionController.validateSession, podcastsController.podcastsUpdate);

// Tweets
router.get('/tweets', sessionController.validateSession, tweetsController.tweetsIndex);
router.get('/tweets/new', sessionController.validateSession, tweetsController.tweetsNew);
router.post('/tweets/create', sessionController.validateSession, tweetsController.tweetsCreate);
router.post('/tweets/:id/delete', sessionController.validateSession, tweetsController.tweetsDestroy);

// Images
router.get('/images', sessionController.validateSession, imagesController.imagesIndex);
router.get('/images/new', sessionController.validateSession, imagesController.imagesNew);
router.post('/images/create', sessionController.validateSession, imagesController.imagesCreateCollection);
router.post('/images/createImage', sessionController.validateSession, imagesController.imagesCreateImage);
router.post('/images/process', sessionController.validateSession, imagesController.imagesProcess);
router.post('/images/:id/delete', sessionController.validateSession, imagesController.imagesCollectionDestroy);
router.post('/images/:collection_id/image/:id/delete', sessionController.validateSession, imagesController.imagesImageDestroy);

module.exports = router;
