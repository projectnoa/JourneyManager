// xml.js

/**
 * Required External Modules
 */

import { parseString, Builder } from "xml2js";

/**
 * Methods
 */

export function jsonToXML(json) {
    // Convert to XML
    let builder = new Builder({ cdata: true });
    return builder.buildObject(json);
}

export function parseData(data) {
    return new Promise(function(resolve, reject) {
        // Parse data
        parseString(data, { explicitArray: false, trim: true, normalize: true }, function(err, result) {
            if (err) {
                // Return error
                reject(err);
            } else {
                // Return result
                resolve(result);
            }
        });
    });
}