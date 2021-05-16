
var dateFormat = require('dateformat');

function Collection(item) {
    this.data = item.$ || {};

    this.id = this.data.id || null;
    this.title = this.data.title || null;
    this.date = (this.data.date !== undefined ? dateFormat(new Date(this.data.date), "dddd, mmmm dS, yyyy") : null) || null;

    if (item.image !== undefined) {
        if (typeof item.image === 'array' || item.image instanceof Array) {
            this.images = item.image.map(image => { return { id: image.$.id, title: image.$.title, url: image.$.url, width: image.$.width, height: image.$.height} })
        } else {
            this.images = [{ id: item.image.$.id, title: item.image.$.title, url: item.image.$.url, width: item.image.$.width, height: item.image.$.height }]
        }
    } else {
        this.images = null;
    }
};

module.exports = Collection;