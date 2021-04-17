// xml.js

/**
 * Required External Modules
 */

var parseString = require("xml2js").parseString;
var xml2js = require("xml2js");

/**
 * Methods
 */

exports.jsonToXML = (json) => {
    // Convert to XML
    var builder = new xml2js.Builder();
    return builder.buildObject(json);
}

exports.parseData = (data) => {
    return new Promise(function(resolve, reject) {
        // Parse data
        parseString(data, function(err, result) {
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