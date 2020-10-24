// start.js

/**
 * Required External Modules
 */

const app = require('./app');

/**
 * Server Activation
 */

const server = app.listen(3000, () => {
    console.log(`app server listening at port ${server.address().port}`)
});