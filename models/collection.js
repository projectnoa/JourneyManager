
var dateFormat = require('dateformat');

function Collection(item) {
    this.data = item.$ || {};

    this.id = this.data.id || null;
    this.title = this.data.title || null;
    this.date = (this.data.date !== undefined ? dateFormat(new Date(this.data.date), "dddd, mmmm dS, yyyy") : null) || null;
    this.images = (item.image !== undefined ? item.image.map(image => { return { id: image.$.id, title: image.$.title, url: image.$.url, width: image.$.width, height: image.$.height} }) : []) || null;
};

module.exports = Collection;