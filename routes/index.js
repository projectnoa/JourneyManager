// index.js

/**
 * Required External Modules
 */

import { Router } from 'express';

// Controllers
import { validateSession } from './../controllers/session.js';
import { postsIndex, postsNew, postsCreate, tagsSearch, tagsAll } from './../controllers/posts.js';
import { podcastsIndex, podcastsNew, podcastsCreate, podcastsEdit, podcastsUpdate } from './../controllers/podcasts.js';
import { recordingsIndex, recordingsCreateSeason, recordingsCreateFile, recordingsTranscript } from './../controllers/recordings.js';
import { imagesIndex, imagesNew, imagesCreateCollection, imagesCreateImage, imagesProcess, imagesCollectionDestroy, imagesImageDestroy } from './../controllers/images.js';

/**
 * App Variables
 */

const router = Router();

/**
 * Routes Definitions
 */

// Home
router.get('/', (req, res) => {
  res.render('home', { title: 'Home', authorized: false });
});

// Dashboard
router.get('/dashboard', validateSession, (req, res) => {
  res.render('dashboard', { title: 'Dashboard', authorized: true });
});

// Posts
router.get('/posts', validateSession, postsIndex);
router.get('/posts/new', validateSession, postsNew);
router.post('/posts/create', validateSession, postsCreate);

router.get('/tags/search', validateSession, tagsSearch);
router.get('/tags', validateSession, tagsAll);

// Podcasts
router.get('/podcasts', validateSession, podcastsIndex);
router.get('/podcasts/new', validateSession, podcastsNew);
router.post('/podcasts/create', validateSession, podcastsCreate);
router.post('/podcasts/:id/edit', validateSession, podcastsEdit);
router.post('/podcasts/:id/update', validateSession, podcastsUpdate);

// Recordings
router.get('/recordings', validateSession, recordingsIndex);
router.post('/recordings/season', validateSession, recordingsCreateSeason);
router.post('/recordings/create', validateSession, recordingsCreateFile);
router.post('/recordings/transcript', validateSession, recordingsTranscript);

// Images
router.get('/images', validateSession, imagesIndex);
router.get('/images/new', validateSession, imagesNew);
router.post('/images/create', validateSession, imagesCreateCollection);
router.post('/images/createImage', validateSession, imagesCreateImage);
router.post('/images/process', validateSession, imagesProcess);
router.post('/images/:id/delete', validateSession, imagesCollectionDestroy);
router.post('/images/:collection_id/image/:id/delete', validateSession, imagesImageDestroy);

export default router;
