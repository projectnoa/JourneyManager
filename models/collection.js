
import dateFormat from 'dateformat';

const baseDateFormat = "dddd, mmmm dS, yyyy";

class Collection {
    constructor(item) {
        this.data = item.$ || {};

        this.id = this.data.id || null;
        this.title = this.data.title || null;
        this.date = this.data.date ? dateFormat(new Date(this.data.date), baseDateFormat) : null;

        this.images = this.processImages(item.image);
    }

    processImages(images) {
        if (images === undefined) return null;

        const imageList = Array.isArray(images) ? images : [images];

        return imageList.map(image => {
            const { id, title, url, width, height } = image.$;

            return { id, title, url, width, height };
        });
    }
};

export default Collection;