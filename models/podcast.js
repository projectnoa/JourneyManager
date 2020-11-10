
var dateFormat = require('dateformat');

function Podcast(item) {
    this.id = dateFormat(new Date(item.pubDate[0]), "yyyymmddHHMMss")
    this.title = item.title[0] || null;
    this.postLink = item.link[0] || null;
    this.pubDate = item.pubDate[0] || null;
    this.description = item.description[0] || null
    this.url = item.guid[0] || null;
    this.duration = item['itunes:duration'][0] || null; 
    this.keywords = item['itunes:keywords'][0] || null;
    this.explicit = item['itunes:explicit'][0] || null;
};

module.exports = Podcast;