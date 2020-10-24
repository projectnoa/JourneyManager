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

// Podcasts
router.get('/podcasts', sessionController.validateSession, podcastsController.podcastsIndex);
router.get('/podcasts/new', sessionController.validateSession, podcastsController.podcastsNew);
router.put('/podcasts/create', sessionController.validateSession, podcastsController.podcastsCreate);

// Tweets
router.get('/tweets', sessionController.validateSession, tweetsController.tweetsIndex);
router.get('/tweets/new', sessionController.validateSession, tweetsController.tweetsNew);
router.put('/tweets/create', sessionController.validateSession, tweetsController.tweetsCreate);
router.post('/tweets/:id', sessionController.validateSession, tweetsController.tweetsEdit);
router.post('/tweets/:id/update', sessionController.validateSession, tweetsController.tweetsUpdate);
router.delete('/tweets/:id/delete', sessionController.validateSession, tweetsController.tweetsDestroy);

module.exports = router;