
var dateFormat = require('dateformat');

function Post(item) {
    this.id = item.id;
    this.title = item.title.rendered || null;
    this.link = item.link || null;
    this.status = item.status || null;
    this.image = item._embedded["wp:featuredmedia"][0].source_url || null;
    this.comment_status = item.comment_status || null;
    this.author = (item.author == 1 ? 'Juan' : 'Wendy');
    this.created = dateFormat(new Date(item.date), "dddd, mmmm dS, yyyy") || null;
    this.updated = dateFormat(new Date(item.modified), "dddd, mmmm dS, yyyy") || null;
    this.content = item.content.rendered.replace(/<[^>]*>?/gm, '').replace(/[^a-zA-Z ]/g, '').slice(0, 800) + '...' || null;
    this.excerpt = item.excerpt.rendered.replace(/<[^>]*>?/gm, '').replace(/[^a-zA-Z ]/g, '').slice(0, 800) + '...' || null;
};

module.exports = Post;