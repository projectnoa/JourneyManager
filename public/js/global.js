
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