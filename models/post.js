
function Post(id, title, content) {
    this.id = id || null;
    this.title = title || null;
    this.content = content.replace(/<[^>]*>?/gm, '').replace(/[^a-zA-Z ]/g, '').slice(0, 300) + '...' || null;
};

module.exports = Post;