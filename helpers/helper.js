
const SSHTML = require('string-strip-html');

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
    res.cookie('_JourneyManager_notice', message, { maxAge: 1000 * 3, httpOnly: false, signed: false });
}

exports.isStrEq = (str, val) => {
    return (this.isDefined(str) && (typeof str === 'string' || str instanceof String) && str.toLowerCase() == val.toLowerCase())
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
    const spacer = '';
    const discussion = '';

    return spacer + discussion;
}

exports.postFooter = () => {
    const spacer = '';
    const discussion = '';

    return spacer + discussion;
}

exports.stripHTML = (str) => {
    return SSHTML.stripHtml(str).result;
}

exports.clearHTMLStyles = (str) => {
    str = str.replace(/<strong><br><\/strong>/g, '<br>');
    str = str.replace(/<p><br><\/p>/g, '<br>');
    str = str.replace(/<strong><\/strong>/g, '');
    str = str.replace(/<p><\/p>/g, ''); // put last.

    // for chrome bug. https://github.com/Alex-D/Trumbowyg/issues/103
    str = str.replace(/ ?face=[\d\D]* ?/g, '');
    str = str.replace(/ ?font-family:[\d\D]*; ?/g, '');
    str = str.replace(/ ?font-family:[\d\D]*; ?/g, '');
    str = str.replace(/ ?font-size:[\d\D]*; ?/g, '');
    str = str.replace(/ ?font-weight:[\d\D]*; ?/g, '');
    str = str.replace(/ ?line-height:[\d\D]*; ?/g, '');
    str = str.replace(/ ?background-color:[\d\D]*; ?/g, '');
    str = str.replace(/ ?color:[\d\D]*; ?/g, '');

    str = str.replace(/ ?id="null" ?/g, '');
    str = str.replace(/ ?text-align: left; ?/g, '');
    str = str.replace(/ style=""/g, '');
    str = str.replace(/<>/g, '');

    return str;
}

exports.comply = (str) => {
    str = str.replace(/&rsquo;/g, '&apos;');
    str = str.replace(/&lsquo;/g, '&apos;');
    str = str.replace(/&ldquo;/g, '&quot;');
    str = str.replace(/&rdquo;/g, '&quot;');
    str = str.replace(/\'s/g, '&apos;s');
    str = str.replace(/ "/g, ' &quot;');
    str = str.replace(/" /g, '&quot; ');
    str = str.replace(/,"/g, ',&quot;');
    str = str.replace(/",/g, '&quot;,');
    str = str.replace(/\."/g, '.&quot;');
    str = str.replace(/"\./g, '&quot;.');
    str = str.replace(/ & /g, '&amp;');
    str = str.replace(/ < /g, '&lt;');
    str = str.replace(/ > /g, '&gt;');
    str = str.replace(/©/g, '&#xA9;');
    str = str.replace(/℗/g, '&#x2117;');
    str = str.replace(/™/g, '&#x2122;');

    return str;
}