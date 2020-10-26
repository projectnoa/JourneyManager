
var dateFormat = require('dateformat');

function Tweet(id, description, date) {
    this.id = id || null;
    this.description = parseTweet(description);
    this.date = dateFormat(new Date(date), "dddd, mmmm dS, yyyy");
};

var parseTweet = (text) => {
    text = text.replace(/(^|\s)(#[a-z\d-]+)/ig, '<em class="hashtag">$&</em>');
    text = text.replace(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g, '<em class="url">$&</em>');

    return text;
}

module.exports = Tweet;