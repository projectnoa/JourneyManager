
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
    let notice = getCookie('_JourneyManager_notice');
    // Check if any notice is set
    if (isDefined(notice) && notice.length > 0) {
        // Display notice
        displayNotice(notice);
    }
}

function getCookie(cname) {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');

    for(const element of ca) {
      let c = element;

      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }

      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    
    return "";
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

function setDeleteBehavior() {
    let elements = document.querySelectorAll('[data-behavior~="delete"]');

    elements.forEach(element =>
        element.addEventListener('click', (event) => {
            let target = event.target;

            let action = target.dataset.action;
            let message = target.dataset.message;

            displayConfirm(message, () => {
                axios.post(action)
                .then(response => {
                    console.log(response);
                })
                .catch(error => {
                    console.log(error);
                });
            });
        }, false)
    );
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
                // Trigger submit event
                document.querySelector("[data-id~='" + form + "']").submit();
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
    let confirmAction = modal.querySelector('button[data-behavior~="confirmed"]');
    confirmAction.addEventListener('click', (event) => {
        // Get element
        let target = event.target;
        // Run callback
        callback(target);
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

function isDefined(value) {
    return (value !== undefined && value !== null);
}
