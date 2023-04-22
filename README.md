# Juandy Journey Manager

Personal podcast and post resource dashboard

### Env
Variables needed

- NODE_ENV=production 
- JM_DOMAIN=DOMAIN_URL 
- JM_WP_ENDPOINT=BLOG_URL 
- JM_WP_API_USER=USER 
- JM_WP_API_PASS=API_PASS
- JM_WP_AUTH_ID=WP_AUTH_ID
- JM_WP_AUTH_SEC=WP_AUTH_SEC
- JM_AWS_S3_ID=AWS_S3_ID
- JM_AWS_S3_SEC=AWS_S3_SEC 
- JM_COOKIE_SECRET=COOKIE_SECRET

### Setup
Make sure the ./uploads/ directory and ./public/transcripts/ directory exists. Additionally, make sure that a index.json file exists in the transcripts directory with the following structure

{ "transcripts": [] }

### How to start

To start, run the following command:

NODE_ENV=production JM_DOMAIN=DOMAIN_URL JM_WP_ENDPOINT=BLOG_URL JM_WP_API_USER=USER JM_WP_API_PASS=API_PASS JM_WP_AUTH_ID=WP_AUTH_ID JM_WP_AUTH_SEC=WP_AUTH_SEC JM_AWS_S3_ID=AWS_S3_ID JM_AWS_S3_SEC=AWS_S3_SEC JM_COOKIE_SECRET=COOKIE_SECRET node -r dotenv/config ./start.js