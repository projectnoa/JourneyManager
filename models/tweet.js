
var dateFormat = require('dateformat');

function Tweet(item) {
    this.id = item.id || null;
    this.description = parseDesc(item.description);
    this.description_raw = item.description;
    this.date = dateFormat(new Date(item.date), "dddd, mmmm dS, yyyy");
    this.date_raw = item.date;
};

var parseDesc = (text) => {
    text = text.replace(/(^|\s)(#[a-z\d-]+)/ig, '<em class="hashtag">$&</em>');
    // text = text.replace(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g, '<a href="$&">$&</a>');
    // text = text.replace(/\n/g, '<br />');

    return text;
}

module.exports = Tweet;