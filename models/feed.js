
import { sanitize, clearHTMLStyles, isDefined } from './../helpers/helper.js';
import { warn } from './../helpers/winston.js';

const postURL = 'https://www.ajourneyforwisdom.com/podcast/';

class Feed {
    constructor(req) {
        if (!isDefined(req) || !isDefined(req.body))
            return;

        // Set properties
        this.title = sanitize(req.body.title);
        this.description = clearHTMLStyles(sanitize(req.body.description));
        this.description += clearHTMLStyles(sanitize(req.body.info));
        this.season = req.body.season;
        this.episode = req.body.episode;
        this.explicit = (req.body.explicit === 'on' || req.body.explicit == 'true') ? 'yes' : 'no';
        this.length = req.body.length;
        this.duration = req.body.duration;
        this.location = req.body.location;
        this.track_location = req.body.location.replace('https://', 'https://chrt.fm/track/3AFA92/dts.podtrac.com/redirect.mp3/');
        // Process post URL
        this.postSlug = '';
        this.post_url = '';

        if (isDefined(req.body.posturl)) {
            this.postSlug = encodeURI(req.body.posturl.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, '').replace(/[^a-z0-9]/g, '-').replace(/--/g, '-'));
            this.post_url = postURL + this.postSlug;
        }

        // Processing tags
        this.tags = [];
        this.keywords = [];
        
        if (!isDefined(req.body.keywords)) return;

        if (typeof req.body.keywords === 'string' && req.body.keywords.length > 0) {
            if (req.body.keywords.startsWith('[')) {
                try {
                    this.tags = JSON.parse(req.body.keywords);
                    this.keywords = this.tags.map(tag => tag.value);
                } catch (err) {
                    warn(' -- Tags could not be processed.' + err.message);
                }
            } else {
                this.tags = req.body.keywords.split(',');
                this.keywords = this.tags;
            }
        }
    }
};

export default Feed;