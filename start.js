// start.js

/**
 * Required External Modules
 */

import app from './app.js';

/**
 * Server Activation
 */

const server = app.listen(3000, () => {
    console.log(`app server listening at port ${server.address().port}`)
});