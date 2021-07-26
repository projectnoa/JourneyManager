
var dateFormat = require('dateformat');

function Season(item, published) {
    this.data = item.$ || {};

    this.id = this.data.id || null;
    this.season = this.data.season || null;
    this.date = (this.data.date !== undefined ? dateFormat(new Date(this.data.date), "ddd, mmm d yy") : null) || null;

    if (item.file !== undefined) {
        if (typeof item.file === 'array' || item.file instanceof Array) {
            this.files = item.file.map(file => { 

                var publishData = published.find(i => i.url == file.$.url);
                var isPublished = publishData !== undefined && publishData !== null;
                var pubDate = isPublished ? dateFormat(new Date(publishData.pubdate), "ddd, mmm d yy")  : ' - ';

                return { 
                    id: file.$.id, 
                    title: file.$.title, 
                    url: file.$.url, 
                    episode: file.$.episode, 
                    length: file.$.length, 
                    duration: file.$.duration,
                    date: dateFormat(new Date(file.$.date), "ddd, mmm d yy"),
                    published: isPublished,
                    pubdate: pubDate
                } 
            });
        } else {
            var publishData = published.find(i => i.url == item.file.$.url);
            var isPublished = publishData !== undefined && publishData !== null;
            var pubDate = isPublished ? dateFormat(new Date(publishData.pubdate), "ddd, mmm d yy")  : ' - ';

            this.files = [
                { 
                    id: item.file.$.id, 
                    title: item.file.$.title, 
                    url: item.file.$.url, 
                    episode: item.file.$.episode, 
                    length: item.file.$.length, 
                    duration: item.file.$.duration,
                    date: dateFormat(new Date(item.file.$.date), "ddd, mmm d yy"),
                    published: isPublished,
                    pubdate: pubDate
                }
            ];
        }
    } else {
        this.files = null;
    }
};

module.exports = Season;