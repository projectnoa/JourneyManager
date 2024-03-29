
let setupDatepicker = () => {
  // Get datepicker element
  let datepickerElement = document.querySelector('[data-behavior~="datetime-picker"]');
  
  // Set datepicker behavior
  $(datepickerElement).datetimepicker({
      locale: 'en',
      format: 'ddd, D MMM YYYY HH:mm',
      defaultDate: new Date(),
      sideBySide: false,
      showTodayButton: true,
      showClose: true,
      keepOpen: false,
      ignoreReadonly: true,
      icons: {
          time: 'far fa-clock',
          date: 'far fa-calendar-alt',
          up: 'fas fa-arrow-up',
          down: 'fas fa-arrow-down',
          previous: 'fas fa-angle-double-left',
          next: 'fas fa-angle-double-right',
          today: 'far fa-calendar-check',
          clear: 'fas fa-trash',
          close: 'fas fa-times'
      }
  });
};

let setupForm = () => {
  // Get form element
  let formElement = document.querySelector('form');
  // Add event listener
  formElement.addEventListener('submit', event => {
    // Store reference to form to make later code easier to read
    const target = event.target;
    // If the form is valid
    if ($(target).valid()) {
      // Create form data
      // const formData = new FormData(target);
      let data = Object.fromEntries(new FormData(target).entries());
      // Make request
      axios.post(
        target.action,
        data,
        {
            timeout: 300000,
            responseType: 'json'
        }
      )
      .then(response => {
        // Hide loading screen
        displayLoading(false);

        if (isDefined(response) && isDefined(response.data)) {
          let message = response.data.message;
          let redirectTo = response.data.redirectTo;

          // If message exists
          if (isDefined(message) && message.length > 0) {
            // Display message
            displayNotice(message);
          } else if (isDefined(redirectTo) && redirectTo.length > 0) {
            // Redirect on success
            window.location.href = redirectTo;
          }
        } else {
          displayNotice('There was an error.');
        }
      })
      .catch(err => {
        // Hide loading screen
        displayLoading(false);
        // Log error
        console.log(err);
        // Display error
        displayNotice(err);
      });
      // Prevent the default form submit
      event.preventDefault();
      // Display loading screen
      displayLoading(true);
    }
  });
  // Set form validation
  setPodcastFormValidationBehavior();

  $('textarea').trumbowyg(
    {
      removeformatPasted: true,
      btns: [
        ['viewHTML'],
        ['undo', 'redo'],
        ['strong', 'em', 'del'],
        ['link'],
        ['unorderedList', 'orderedList'],
        ['removeformat']
      ]
    }
  );

  // Get title element
  let titleElement = document.querySelector('input[data-behavior~="post-title"]');

  if (titleElement !== null) {
    titleElement.addEventListener('input', event => {
      // Store reference to title
      const target = event.target;
  
      let urlElement = document.querySelector('input[data-behavior~="post-url"]');
  
      urlElement.value = encodeURI(target.value.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
    });
  }

  let keywordsElement = document.querySelector('input[data-behavior~="keywords"]'),
    tagify = new Tagify(keywordsElement, {
        whitelist : [],
        maxTags: 8,
        transformTag: (tag) => {
          if (tag) {
            let text = tag.value;

            tag.value = text[0].toUpperCase() + text.substring(1);
          }
        },
        dropdown : {
            classname     : "tags-look",
            maxItems      : 20,
            closeOnSelect : true,          // keep the dropdown open after selecting a suggestion
        }
    }),
    controller;

  // Listen to any keystrokes which modify tagify's input
  tagify.on('input', event => {
    let value = event.detail.value;
    tagify.whitelist = null; // reset the whitelist

    // https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
    controller && controller.abort();
    controller = new AbortController();

    // show loading animation and hide the suggestions dropdown
    tagify.loading(true).dropdown.hide();

    fetch('/tags/search?term=' + value, { signal:controller.signal })
      .then(RES => RES.json())
      .then(function(newWhitelist) {
        tagify.whitelist = newWhitelist; // update inwhitelist Array in-place
        tagify.loading(false).dropdown.show(value); // render the suggestions dropdown
      }).catch(err => {
        // console.log(err);
      });
  });
};

function podcastsSetup() {
  $('#episode-data').on('show.bs.modal', (event) => {
    const button = $(event.relatedTarget); // Button that triggered the modal
    const content = button.data('content'); // Extract info from data-* attributes
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    document.querySelector("textarea[name~='episode-data']").value = JSON.stringify(content, null, 4);
  })
}

function newPodcastSetup() {
    setupDatepicker();
    setupForm();
}

function editPodcastSetup() {
  setupForm();
}

function copyhtml() {
  const tag = document.querySelector('div[class="modal-body newsletter-html"]');

  copyTextToClipboard(tag.innerHTML);
}