
// Add onPageLoad event
window.addEventListener("load", () => {
    let meta = document.querySelector('meta[name="page-id"]');

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