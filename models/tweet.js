
var dateFormat = require('dateformat');

function Tweet(item) {
    this.id = item.id[0] || null;
    this.description = parseDesc(item.description[0]);
    this.description_raw = item.description[0];
    this.date = dateFormat(new Date(item.date[0]), "dddd, mmmm dS, yyyy");
    this.date_raw = item.date[0];
};

var parseDesc = (text) => {
    text = text.replace(/(^|\s)(#[a-z\d-]+)/ig, '<em class="hashtag">$&</em>');
    text = text.replace(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g, '<a href="$&">$&</a>');
    text = text.replace(/\n/g, '<br />');

    return text;
}

module.exports = Tweet;