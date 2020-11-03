
var fetch = require('node-fetch');

const xml = require('./../helpers/xml');

var fetchData = async (url) => {
    // Fetch data
    let response = await fetch(url, { 
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36', 
        'accept': 'text/html,application/xhtml+xml' 
    });
    // Translate into text 
    let data = await response.text();
    // Parse data
    let result = await xml.parseData(data);
    // Return result
    return result;
}

module.exports = fetchData;