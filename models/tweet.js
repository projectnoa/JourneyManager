
var dateFormat = require('dateformat');

function Tweet(id, description, date) {
    this.id = id || null;
    this.description = description.replace(/(^|\s)(#[a-z\d-]+)/ig, '<mark>$&</mark>');
    this.date = dateFormat(new Date(date), "dddd, mmmm dS, yyyy");
};

module.exports = Tweet;