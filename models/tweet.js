
import dateFormat from 'dateformat';

class Tweet {
    constructor(item) {
        this.id = item.id || null;
        this.description = parseDesc(item.description);
        this.description_raw = item.description;
        this.date = dateFormat(new Date(item.date), "dddd, mmmm dS, yyyy");
        this.date_raw = item.date;
    }
};

let parseDesc = (text) => {
    text = text.replace(/(^|\s)(#[a-z\d-]+)/ig, '<em class="hashtag">$&</em>');

    return text;
}

export default Tweet;