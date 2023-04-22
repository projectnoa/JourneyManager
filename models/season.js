
import dateFormat from 'dateformat';

const baseDateFormat = "ddd, mmm d yy";

class Season {
    constructor(item, published, transcripts) {
        this.data = item.$ || {};

        this.id = this.data.id || null;
        this.season = this.data.season || null;
        this.date = this.data.date ? dateFormat(new Date(this.data.date), baseDateFormat) : null;

        this.files = this.processFiles(item.file, published, transcripts);
    }

    processFiles(files, published, transcripts) {
        if (files === undefined) return null;

        const fileList = Array.isArray(files) ? files : [files];

        return fileList.map(file => {
            const { id, title, url, episode, length, duration, date } = file.$;
            const publishData = published.find(i => this.getID(i.url) == this.getID(url));
            const isPublished = publishData !== undefined && publishData !== null;
            const pubDate = isPublished ? dateFormat(new Date(publishData.pubdate), baseDateFormat) : ' - ';
            const transcript = transcripts.find(i => i.id == this.getID(url));

            return {
                id,
                title, 
                url, 
                episode, 
                length, 
                duration, 
                date: dateFormat(new Date(date), baseDateFormat), 
                published: isPublished, 
                pubdate: pubDate, 
                transcriptPath: transcript !== undefined && transcript !== null ? transcript.path : null
            };
        });
    }

    getID(url) {
        return url.split('/')[5].split('-')[0];
    }
};

export default Season;