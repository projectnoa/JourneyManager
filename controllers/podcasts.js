// podcasts.js

/**
 *  Methods
 */

exports.podcastsIndex = (req, res, next) => {
    res.render('./podcasts/index', { title: 'Podcasts', authorized: true, items: null });
};

exports.podcastsNew = (req, res, next) => {
    
};

exports.podcastsCreate = (req, res, next) => {
    
};