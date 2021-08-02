
const helpers = require('./../helpers/helper');
const winston = require('./../helpers/winston');

const postURL = 'https://www.ajourneyforwisdom.com/podcast/';

function Feed(req) {
    if (!helpers.isDefined(req) || !helpers.isDefined(req.body)) return;
    
    // Set properties
    this.title = helpers.sanitize(req.body.title);
    this.description = helpers.clearHTMLStyles(helpers.sanitize(req.body.description));
    this.description += helpers.clearHTMLStyles(helpers.sanitize(req.body.info));    
    this.season = req.body.season;
    this.episode = req.body.episode;
    this.explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';
    this.length = req.body.length;
    this.duration = req.body.duration;
    this.location = req.body.location;
    // Process post URL
    this.postSlug = '';
    this.post_url = '';
    if (helpers.isDefined(req.body.posturl)) {
        this.postSlug = encodeURI(req.body.posturl.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, '').replace(/[^a-z0-9]/g, '-').replace(/--/g, '-'));
        this.post_url = postURL + this.postSlug;
    }
    // Processing tags
    this.tags = [];
    this.keywords = [];
    try {
        this.tags = JSON.parse(req.body.keywords);    
        this.keywords = this.tags.map(tag => tag.value);
    } catch (err) {
        winston.warn(' -- Tags could not be processed.' + err.message);
    }
};

module.exports = Feed;