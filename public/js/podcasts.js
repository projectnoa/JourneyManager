
let setupDatepicker = () => {
  // Get datepicker element
  let datepickerElement = document.querySelector('[data-behavior~="datetime-picker"]');

  const weekday = moment().isoWeekday();
  const sunday = 7;

  let date = new Date();

  if (weekday != sunday) {
    // Initialize next Sunday
    date = moment().add(sunday - weekday, 'days').toDate();
  }

  date.setHours(9);
  date.setMinutes(0);
  date.setSeconds(0);
  
  // Set datepicker behavior
  $(datepickerElement).datetimepicker({
      locale: 'en',
      format: 'ddd, D MMM YYYY HH:mm',
      // minDate: date,
      defaultDate: date,
      sideBySide: false,
      showTodayButton: true,
      showClose: true,
      keepOpen: false,
      ignoreReadonly: true, 
      // daysOfWeekDisabled: [1, 2, 3, 4, 5, 6],
      // enabledHours: [9],
      // timeZone: 'America/Los_Angeles',
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

// Helper functions
const displayNoticeAndHideLoading = (message) => {
  displayLoading(false);
  displayNotice(message);
};

const handleAxiosResponse = (response) => {
  displayLoading(false);

  if (response && response.data) {
    const { message, redirectTo } = response.data;

    if (message && message.length > 0) {
      displayNotice(message);
    } else if (redirectTo && redirectTo.length > 0) {
      window.location.href = redirectTo;
    }
  } else {
    displayNotice('There was an error.');
  }
};

const handleAxiosError = (err) => {
  displayLoading(false);
  console.log(err);
  displayNotice(err);
};

// Main function
let setupForm = () => {
  // Get form element
  const formElement = document.querySelector('form');
  const titleElement = document.querySelector('input[data-behavior~="post-title"]');
  const keywordsElement = document.querySelector('input[data-behavior~="post-url"]');
  const tagify = new Tagify(keywordsElement, { /* options */ });

  // Set form validation
  setPodcastFormValidationBehavior();

  // Initialize Trumbowyg
  $('textarea').trumbowyg({ /* options */ });

  // Add event listeners
  if (titleElement) {
    titleElement.addEventListener('input', event => {
      const target = event.target;
      const urlElement = document.querySelector('input[data-behavior~="post-url"]');
      urlElement.value = encodeURI(target.value.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/[^a-z0-9]/g, '-'));
    });
  }

  tagify.on('input', event => {
    // Handle tagify input event
  });

  formElement.addEventListener('submit', event => {
    const target = event.target;

    if ($(target).valid()) {
      const data = Object.fromEntries(new FormData(target).entries());
      event.preventDefault();
      displayLoading(true);

      axios.post(target.action, data, { timeout: 300000, responseType: 'json' })
        .then(handleAxiosResponse)
        .catch(handleAxiosError);
    }
  });
};

function podcastsSetup() {
  $('#episode-data').on('show.bs.modal', (event) => {
    let button = $(event.relatedTarget); // Button that triggered the modal
    const content = button.data('content'); // Extract info from data-* attributes
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    document.querySelector("textarea[name~='episode-data']").value = JSON.stringify(content, null, 4);
  })

  document.querySelector('button[data-behavior~="refresh"]').addEventListener('click', refreshPage);
}

function newPodcastSetup() {
    setupDatepicker();
    setupForm();
}

function editPodcastSetup() {
  setupForm();
}

function copyhtml() {
  let tag = document.querySelector('div[class="modal-body newsletter-html"]');

  copyTextToClipboard(tag.innerHTML);
}

function copyTextToClipboard(text) {
  navigator.clipboard.writeText(text)
  .then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}