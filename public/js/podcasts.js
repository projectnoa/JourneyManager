

var setupDatepicker = () => {
  // Get datepicker element
  let datepickerElement = document.querySelector('[data-behavior~="datetime-picker"]');
  // Initialize current date with time as 9 AM
  var date = new Date();
  date.setHours(09);
  date.setMinutes(00);
  date.setSeconds(00);
  // Set datepicker behavior
  $(datepickerElement).datetimepicker({
      locale: 'en',
      format: 'M/D/YYYY hh:mm a',
      minDate: date,
      defaultDate: date,
      sideBySide: true,
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
      },
      showClose: true
  });
};

var setupUploader = () => {
  // Get File upload element
  let fileElement = document.querySelector('[data-behavior~="file-upload"]');
  // Add event listener
  fileElement.addEventListener('change', event => {
    let target = event.target;
    // If files exists
    if (target.files && target.files[0]) {
      // Display loading screen
      displayLoading(true);
      // Set length (File size in bytes)
      document.querySelector('input[type="hidden"][name="length"]').value = target.files[0].size;
      // Initialize file reader
      let reader = new FileReader();
      // Set load listener
      reader.onload = (e) => {
        // Get data
        let arrayBuffer = e.target.result;
        let fileName = target.files[0].name;
        // Set filename on view
        target.setAttribute("data-title", fileName);
        // Create an instance of AudioContext
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Asynchronously decode audio file data contained in an ArrayBuffer.
        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
            // Obtain the duration in seconds of the audio file
            let duration = Math.round(buffer.duration);
            // Set duration info
            document.querySelector('input[type="hidden"][name="duration"]').value = duration;
            // Hide loading screen
            displayLoading(false);
        });
      }
      // Start file reader as array buffer
      reader.readAsArrayBuffer(target.files[0]);
    }
  });
};

var setupForm = () => {
  // Get form element
  let formElement = document.querySelector('form');
  // Add event listener
  formElement.addEventListener('submit', event => {
    // Store reference to form to make later code easier to read
    const target = event.target;
    // If the form is valid
    if ($(target).valid()) {
      // Create form data
      const formData = new FormData(target);
      // Make request
      axios.post(
        target.action,
        formData,
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
        ['undo', 'redo'], // Only supported in Blink browsers
        // ['formatting'],
        ['strong', 'em', 'del'],
        // ['superscript', 'subscript'],
        ['link'],
        // ['insertImage'],
        // ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
        ['unorderedList', 'orderedList'],
        // ['horizontalRule'],
        ['removeformat']//,
        // ['fullscreen']
    ]
    }
  );
};

function podcastsSetup() {

}

function newPodcastSetup() {
    setupDatepicker();
    setupUploader();
    setupForm();
}

function editPodcastSetup() {
  setupUploader();
  setupForm();
}

function copyhtml() {
  var tag = document.querySelector('div[class="modal-body newsletter-html"]');

  copyTextToClipboard(tag.innerHTML);
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}