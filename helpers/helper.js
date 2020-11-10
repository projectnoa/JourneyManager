
exports.fileFilter = function(req, file, cb) {
    // Accept mp3 files only
    if (!file.originalname.match(/\.(mp3)$/)) {
        req.fileValidationError = 'Only mp3 files are allowed!';

        return cb(new Error('Only mp3 files are allowed!'), false);
    }

    cb(null, true);
};

exports.isDefined = (object) => {
    return (object != undefined && object != null);
}

exports.setNotice = (res, message) => {
    res.cookie('_JourneyManager_notice', message, { maxAge: 1000 * 2, httpOnly: false, signed: false });
}

/**
 * Removes XML-invalid characters from a string.
 * @param {string} string - a string potentially containing XML-invalid characters, such as non-UTF8 characters, STX, EOX and so on.
 * @param {boolean} removeDiscouragedChars - a string potentially containing XML-invalid characters, such as non-UTF8 characters, STX, EOX and so on.
 * @return : a sanitized string without all the XML-invalid characters.
 */
exports.sanitize = (string, removeDiscouragedChars = true) => {
    // remove everything forbidden by XML 1.0 specifications, plus the unicode replacement character U+FFFD
    var regex = /((?:[\0-\x08\x0B\f\x0E-\x1F\uFFFD\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))/g;
    string = string.replace(regex, "");
 
    if (removeDiscouragedChars) {
        // remove everything not suggested by XML 1.0 specifications
        regex = new RegExp(
            "([\\x7F-\\x84]|[\\x86-\\x9F]|[\\uFDD0-\\uFDEF]|(?:\\uD83F[\\uDFFE\\uDFFF])|(?:\\uD87F[\\uDF"+
            "FE\\uDFFF])|(?:\\uD8BF[\\uDFFE\\uDFFF])|(?:\\uD8FF[\\uDFFE\\uDFFF])|(?:\\uD93F[\\uDFFE\\uD"+
            "FFF])|(?:\\uD97F[\\uDFFE\\uDFFF])|(?:\\uD9BF[\\uDFFE\\uDFFF])|(?:\\uD9FF[\\uDFFE\\uDFFF])"+
            "|(?:\\uDA3F[\\uDFFE\\uDFFF])|(?:\\uDA7F[\\uDFFE\\uDFFF])|(?:\\uDABF[\\uDFFE\\uDFFF])|(?:\\"+
            "uDAFF[\\uDFFE\\uDFFF])|(?:\\uDB3F[\\uDFFE\\uDFFF])|(?:\\uDB7F[\\uDFFE\\uDFFF])|(?:\\uDBBF"+
            "[\\uDFFE\\uDFFF])|(?:\\uDBFF[\\uDFFE\\uDFFF])(?:[\\0-\\t\\x0B\\f\\x0E-\\u2027\\u202A-\\uD7FF\\"+
            "uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|"+
            "(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]))", "g");
        string = string.replace(regex, "");
    }

    string = string.replace(/\r/g, '');
 
    return string;
}

exports.formatPost = (text) => {
    // Regular expressions
    const linkRegex = /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig;
    const emailRegex = /.*@.*/;
    // Format paragraphs
    let formatedText = text.split(/\n/).map(paragraph => paragraph.trim().length > 0 ? `<p>${paragraph.trim()}</p>` : '').filter(item => item.length > 0).join('');
    // Format links
    formatedText = formatedText.replace(linkRegex, (match) => {
        if (emailRegex.test(match)) {
            return `<a href="mailto:${match}">${match}</a>`;
        } else {
            return `<a href="${match}">${match}</a>`;
        }
    });

    return formatedText;
}

exports.podcastFooter = () => {
    const spacer = '<div style="height:100px" aria-hidden="true" class="wp-block-spacer"></div>';
    const discussion = '<h3 class="has-text-align-center">Make sure to&nbsp;<a href="https://www.ajourneyforwisdom.com/community/viewforum.php?f=11">join the discussion</a>!</h3>';

    return spacer + discussion;
}

exports.postFooter = () => {
    const spacer = '<div style="height:100px" aria-hidden="true" class="wp-block-spacer"></div>';
    const discussion = '<h3 class="has-text-align-center">Make sure to&nbsp;<a href="https://www.ajourneyforwisdom.com/community/viewforum.php?f=10">join the discussion</a>!</h3>';

    return spacer + discussion;
}