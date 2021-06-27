
var dateFormat = require('dateformat');

function Podcast(item) {
    this.id = dateFormat(getVal(item, 'pubDate'), 'ddmmyyyyhhmm');
    this.title = getVal(item, 'title');
    this.postLink = getVal(item, 'link');
    this.pubDate = dateFormat(getVal(item, 'pubDate'), 'dddd, mmmm dS yyyy, h:MM TT');
    // this.description = parseDesc(getVal(item, 'description'));
    // this.description_raw = getVal(item, 'description');
    this.description = getVal(item, 'description');
    this.url = getVal(item, 'guid');
    this.duration = getVal(item, 'itunes:duration');
    this.keywords = getVal(item, 'itunes:keywords').split(',');
    this.explicit = getVal(item, 'itunes:explicit') == 'true';
    this.episode = getVal(item, 'itunes:episode');
    this.season = getVal(item, 'itunes:season');
    this.type = getVal(item, 'itunes:episodeType');
};

var getVal = (item, property) => {
    let val = (item[property] || ['']);

    if (typeof val == 'object') val = val['_'];

    return val;
};

module.exports = Podcast;