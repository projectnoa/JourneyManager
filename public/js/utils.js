
const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
const hashtagRegex = /(^|\s)(#[a-z\d-]+)/ig

function highlightURL(text) {
    return text.replace(urlRegex, '<em class="url">$&</em>');
}

function highlightHashtag(text) {
    return text.replace(hashtagRegex, '<em class="hashtag">$&</em>');
}

function checkForNotice() {
    // Get element
    let notice = document.querySelector('meta[name="notice"]');
    // Check if any notice is set
    if (isAssigned(notice.content)) {
        // Display notice
        displayNotice(notice.content);
    }
}

function setNoticeBehavior() {
    // Get elements
    let elements = document.querySelectorAll('[data-behavior~="display-notice"]');
    // Add event listeners 
    elements.forEach(element => { 
        element.addEventListener('click', (event) => { 
            // Get element
            let target = event.target;
            // Get text
            let text = target.dataset.text;
            // Display notice
            displayNotice(text);
        });
    });
}

function setConfirmBehavior() {
    // Get elements
    let elements = document.querySelectorAll('[data-behavior~="display-confirm"]');
    // Add event listeners 
    elements.forEach(element => { 
        element.addEventListener('click', (event) => { 
            // Get element
            let target = event.target;
            // Get text
            let text = target.dataset.text;
            // Get confirm target
            let form = target.dataset.target;
            // Display confirm
            displayConfirm(text, () => { 
                // Create event
                let submit_event = document.createEvent("Event");
                submit_event.initEvent("submit", true, true);
                // Trigger submit event
                document.querySelector("[data-id~='" + form + "']").dispatchEvent(submit_event);
            });
        });
    });
}

function displayNotice(text) {
    // Get element
    let modal = document.querySelector('div[data-behavior~="notice-modal"]');
    // Set text
    modal.querySelector('.modal-body').innerHTML = text;
    // Display modal
    $(modal).modal('show');
}

function displayConfirm(text, callback) {
    // Get element
    let modal = document.querySelector('div[data-behavior~="confirm-modal"]');
    // Set text
    modal.querySelector('.modal-body').innerHTML = text;
    // Display modal
    $(modal).modal('show');
    // Add event listener
    modal.querySelector('button[data-behavior~="confirmed"]')
    .addEventListener('click', (event) => {
        // Get element
        let target = event.target;
        // Run callback 
        callback();
    });
}

function displayLoading(show) {
    // Get loading screen
    let screen = document.querySelector('div[data-behavior="loading-screen"]');

    if (show) {
        // Display loading screen
        screen.classList.remove('d-none');
    } else {
        // Display loading screen
        screen.classList.add('d-none');
    }
}

function isAssigned(value) {
    return (value !== undefined && value !== null && value.length > 0);
}