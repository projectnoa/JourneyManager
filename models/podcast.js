
var dateFormat = require('dateformat');

function Podcast(item) {
    this.id = dateFormat(getVal(item, 'pubDate'), 'ddmmyyyyhhmm');
    this.title = getVal(item, 'title');
    this.postLink = getVal(item, 'link');
    this.pubDate = dateFormat(getVal(item, 'pubDate'), 'dddd, mmmm dS yyyy, h:MM TT');
    this.description = parseDesc(getVal(item, 'description'));
    this.description_raw = getVal(item, 'description');
    this.url = getVal(item, 'guid');
    this.duration = getVal(item, 'itunes:duration');
    this.keywords = getVal(item, 'itunes:keywords').split(',');
    this.explicit = getVal(item, 'itunes:explicit') == 'true';
    this.episode = getVal(item, 'itunes:episode');
    this.season = getVal(item, 'itunes:season');
};

var getVal = (item, property) => {
    return (item[property] || [''])[0].trim();
};

var parseDesc = (text) => {
    text = text.replace(/(^|\s)(#[a-z\d-]+)/ig, '<em class="hashtag">$&</em>');
    text = text.replace(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g, '<a href="$&">$&</a>');
    text = text.replace(/\n/g, '<br />');

    return text;
}

module.exports = Podcast;