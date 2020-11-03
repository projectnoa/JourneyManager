
var dateFormat = require('dateformat');

function Collection(item) {
    this.id = item.$.id || null;
    this.title = item.$.title || null;
    this.date = dateFormat(new Date(item.$.date), "dddd, mmmm dS, yyyy") || null;
    this.images = item.image.map(image => { return { id: image.$.id, title: image.$.title, url: image.$.url, width: image.$.width, height: image.$.height} }) || null;
};

module.exports = Collection;