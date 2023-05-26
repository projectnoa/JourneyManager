
const REFRESH_COOKIE = '_JourneyManager_fresh';

// Add onPageLoad event
window.addEventListener("load", () => {
    const meta = document.querySelector('meta[name="page-id"]');

    if (meta !== undefined && meta !== null) {
        const pageFunction = meta.content + 'Setup';
        
        window[pageFunction]();
    }
    // Check for pending notice to display 
    checkForNotice();
    // Set notice behaviors
    setNoticeBehavior();
    // Set confirm behaviors
    setConfirmBehavior();
    // Set delete behaviors 
    setDeleteBehavior();
    // Set copy to clipboard behaviors
    setCopyToClipboard();
});

let refreshPage = () => {
    const date = addMinutes(new Date(), 1);
    document.cookie = `${REFRESH_COOKIE}=true; expires=${date.toGMTString()};`;

    location.reload();
};

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}

function errorSetup() {
    // NOTHING
}

function setCopyToClipboard() {
    // Get copy button
    let copyButton = document.querySelectorAll('[data-behavior~="copy"]');
    // Add event listener
    copyButton.forEach(element => {
        element.addEventListener('click', event => {
            let target = event.target;
            target.focus();
            target.select();

            try {
                let successful = document.execCommand('copy');
                let msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
              } catch (err) {
                console.log('Oops, unable to copy');
              }
        })
    });
}

function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(function() {
            console.log('Async: Copying to clipboard was successful!');
        }, function(err) {
            console.error('Async: Could not copy text: ', err);
        });
}