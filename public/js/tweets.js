

function tweetsSetup() {
    
}

function newTweetSetup() {
    // Get element
    var element = document.querySelector('textarea[data-behavior~="tweet-parse"]');
    // Initialize twitter-text library
    var twitter = require('twitter-text');
    // Maximum tweet lenght
    const maxLength = 280;
    // Add input listener 
    element.addEventListener('input', (event) => {
        // Get element
        let target = event.target;
        // Get text
        let text = target.value.trim();
        // Process tweet data 
        const tweetData = twitter.parseTweet(text);
        // Calculate remaining 
        const remaining = maxLength - tweetData.weightedLength;
        // Set highlight behavior 
        setHighlightBehavior(target, remaining, text, tweetData);
        // Set tweet length data
        setTweetLenghtData(remaining);
        // Set submit button enabled
        setTweetSubmitEnabled(tweetData.valid && tweetData.weightedLength > 5);
    }, false);
    // Set tweet length data
    setTweetLenghtData(maxLength);
    // Set submit button enabled
    setTweetSubmitEnabled(false);
};

var setHighlightBehavior = (target, remaining, text, tweetData) => {
    // Get element
    let placeholderBacker = target.nextSibling;
    // Check if text exceeds limit  
    if (remaining < 0) {
        // Split value if greater than
        const allowed = text.slice(0, tweetData.validRangeEnd);
        const refused = text.slice(tweetData.validRangeEnd);
        // Fill the hidden div
        placeholderBacker.innerHTML = setHighlight(allowed) + '<em class="excess">' + refused + '</em>';
    } else {
        // Fill the hidden div
        placeholderBacker.innerHTML = setHighlight(text);
    }
}

let setHighlight = (text) => {
    // Add highlights to data
    text = highlightHashtag(text);
    text = highlightURL(text);
    // Return highlighted text 
    return text;
}

var setTweetLenghtData = (length) => {
    // Get element
    var element = document.querySelector('span[data-behavior~="tweet-length"]');
    // Set text
    element.innerHTML = length;
    // Remove classes
    element.classList.remove('text-warning');
    element.classList.remove('text-danger');
    // Check to set class 
    if (length < 0) {
        // Set red
        element.classList.add('text-danger');
    } else if (length < 10) {
        // Set yellow
        element.classList.add('text-warning');
    }
}

var setTweetSubmitEnabled = (enabled) => {
    // Get element
    var element = document.querySelector('input[type="submit"]');
    // Remove classes 
    element.classList.remove('btn-primary');
    element.classList.remove('btn-secondary');
    // Add proper class
    element.classList.add(enabled ? 'btn-primary' : 'btn-secondary');
    // Set enabled
    element.disabled = !enabled;
}