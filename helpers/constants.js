
export const AWS_URL = 'https://s3-us-west-2.amazonaws.com';

export const PODCAST_S3_BUCKET = 'podcasts.ajourneyforwisdom.com';
export const RSS_S3_BUCKET = 'rss.ajourneyforwisdom.com';
export const ASSETS_S3_BUCKET = 'assets.ajourneyforwisdom.com';

export const PODCAST_S3_URL = `${AWS_URL}/${PODCAST_S3_BUCKET}`;
export const RSS_S3_URL = `${AWS_URL}/${RSS_S3_BUCKET}`;
export const ASSETS_S3_URL = `${AWS_URL}/${ASSETS_S3_BUCKET}`;

export const RSS_S3_FOLDER = 'rss';
export const BACKUP_S3_FOLDER = 'backup';
export const PODCAST_IMAGES_S3_FOLDER = 'images';

// export const FEED_XML = 'podcast.xml'; // PROD
export const FEED_XML = 'podcast_UAT.xml'; // TEST
export const SETTINGS_XML = 'settings.xml';

export const LOGO_IMAGE = 'DTMG-profile-v5.jpeg';

export const ASSET_POSTS_SOURCE = 'posts';
export const ASSET_EMAILS_SOURCE = 'emails';
export const ASSET_GLOBAL_SOURCE = 'global';

// FEED
export const FEED_XML_URL = `${RSS_S3_URL}/${RSS_S3_FOLDER}/${FEED_XML}`;
export const BACKUP_PATH = `${RSS_S3_URL}/${RSS_S3_FOLDER}/${BACKUP_S3_FOLDER}/`;
// RECORDINGS
export const RECORDINGS_XML_URL = `${PODCAST_S3_URL}/${SETTINGS_XML}`;
export const RECORDINGS_PATH = `${PODCAST_S3_URL}/${new Date().getFullYear()}/`;
export const LOGO_IMAGE_URL = `${PODCAST_S3_URL}/${PODCAST_IMAGES_S3_FOLDER}/${LOGO_IMAGE}`;
// ASSETS
export const ASSET_POSTS_XML_URL = `${ASSETS_S3_URL}/${ASSET_POSTS_SOURCE}/${SETTINGS_XML}`;
export const ASSET_EMAILS_XML_URL = `${ASSETS_S3_URL}/${ASSET_EMAILS_SOURCE}/${SETTINGS_XML}`;
export const ASSET_GLOBAL_XML_URL = `${ASSETS_S3_URL}/${ASSET_GLOBAL_SOURCE}/${SETTINGS_XML}`;

export const ASSET_POSTS_PATH = `${ASSETS_S3_URL}/${ASSET_POSTS_SOURCE}/`;
export const ASSET_EMAILS_PATH = `${ASSETS_S3_URL}/${ASSET_EMAILS_SOURCE}/`;
export const ASSET_GLOBAL_PATH = `${ASSETS_S3_URL}/${ASSET_GLOBAL_SOURCE}/`;

export const ASSET_SOURCE_KEYS = [ASSET_EMAILS_SOURCE, ASSET_GLOBAL_SOURCE, ASSET_POSTS_SOURCE];

export const ASSET_SOURCES = {
    posts: ASSET_POSTS_XML_URL, 
    global: ASSET_GLOBAL_XML_URL, 
    emails: ASSET_EMAILS_XML_URL
};

export const REFRESH_COOKIE = '_JourneyManager_fresh';