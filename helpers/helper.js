
import { stripHtml } from 'string-strip-html';

import path from 'path'
import { fileURLToPath } from 'url'

const getDirName = function (moduleUrl) {
    const filename = fileURLToPath(moduleUrl)
    return path.dirname(filename)
}

export {
    getDirName
}

export function fileFilter(req, file, cb) {
    // Accept mp3 files only
    if (!file.originalname.match(/\.(mp3)$/)) {
        req.fileValidationError = 'Only mp3 files are allowed!';

        return cb(new Error('Only mp3 files are allowed!'), false);
    }

    cb(null, true);
}

export function isDefined(object) {
    return (object != undefined && object != null);
}

export function setNotice(res, message) {
    res.cookie('_JourneyManager_notice', message, { maxAge: 1000 * 3, httpOnly: false, signed: false });
}

export function isStrEq(str, val) {
    return (this.isDefined(str) && (typeof str === 'string' || str instanceof String) && str.toLowerCase() == val.toLowerCase())
}

/**
 * Removes XML-invalid characters from a string.
 * @param {string} string - a string potentially containing XML-invalid characters, such as non-UTF8 characters, STX, EOX and so on.
 * @param {boolean} removeDiscouragedChars - a flag to indicate whether to remove discouraged characters as per XML 1.0 specifications.
 * @return : a sanitized string without all the XML-invalid characters.
 */
export function sanitize(string, removeDiscouragedChars = true) {
    if (typeof string !== 'string') return string || ' - ';
  
    // Remove everything forbidden by XML 1.0 specifications, plus the unicode replacement character U+FFFD
    const forbiddenCharsRegex = /(?:[\0-\x08\x0B\f\x0E-\x1F\uFFFD\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/g;
    string = string.replace(forbiddenCharsRegex, '');
  
    if (removeDiscouragedChars) {
      // Remove everything not suggested by XML 1.0 specifications
      const discouragedCharsRegex = /[\x7F-\x9F\uFDD0-\uFDEF]|[\uD800-\uDBFF](?:[\uDC00-\uDFFF]|[\uDFFE\uDFFF](?:(?:[\uDB7F-\uDBBF])|\uDBFF))/g;
      string = string.replace(discouragedCharsRegex, '');
    }
  
    string = string.replace(/\r/g, '');
  
    return string;
}  
  
export function formatPost(text) {
    // Regular expressions
    const linkRegex = /(?:https?:\/\/(?:www\.)?[a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b[-A-Z0-9@:%_+~#?&/=]*)/ig;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  
    // Format paragraphs
    const formattedText = text
      .split(/\n/)
      .map((paragraph) => {
        const trimmedParagraph = paragraph.trim();
        return trimmedParagraph.length > 0 ? `<p>${trimmedParagraph}</p>` : '';
      })
      .filter((item) => item.length > 0)
      .join('');
  
    // Format links
    const formattedLinks = formattedText.replace(linkRegex, (match) => {
      return emailRegex.test(match)
        ? `<a href="mailto:${match}">${match}</a>`
        : `<a href="${match}">${match}</a>`;
    });
  
    return formattedLinks;
}
  

export function podcastFooter() {
    return baseFooter();
}

export function postFooter() {
    return baseFooter();
}

function baseFooter() {
    const spacer = '';
    const discussion = '';

    return spacer + discussion;
}

export function stripHTML(str) {
    return stripHtml(str).result;
}

export function clearHTMLStyles(str) {
    if (!this.isDefined(str)) return ' - ';
    if (typeof str != String) return str;
  
    str = str.replace(/<strong><br><\/strong>/g, '<br>');
    str = str.replace(/<p><br><\/p>/g, '<br>');
    str = str.replace(/<strong><\/strong>/g, '');
    str = str.replace(/<p><\/p>/g, ''); // put last.
  
    // for chrome bug. https://github.com/Alex-D/Trumbowyg/issues/103
    str = str.replace(/ ?face=.* ?/g, '');
    str = str.replace(/ ?font-family:.*; ?/g, '');
    str = str.replace(/ ?font-family:.*; ?/g, '');
    str = str.replace(/ ?font-size:.*; ?/g, '');
    str = str.replace(/ ?font-weight:.*; ?/g, '');
    str = str.replace(/ ?line-height:.*; ?/g, '');
    str = str.replace(/ ?background-color:.*; ?/g, '');
    str = str.replace(/ ?color:.*; ?/g, '');
  
    str = str.replace(/ ?id="null" ?/g, '');
    str = str.replace(/ ?text-align: left; ?/g, '');
    str = str.replace(/ style=""/g, '');
    str = str.replace(/<>/g, '');
  
    return str;
}
  

export function comply(str) {
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
    str = str.replace(/ & /g, ' &amp; ');
    str = str.replace(/ < /g, ' &lt; ');
    str = str.replace(/ > /g, ' &gt; ');
    str = str.replace(/©/g, '&#xA9;');
    str = str.replace(/℗/g, '&#x2117;');
    str = str.replace(/™/g, '&#x2122;');

    return str;
}