
function podcastsSetup() {
    
}

function newPodcastSetup() {
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
    // Get File upload element
    let fileElement = document.querySelector('[data-behavior~="file-upload"]');
    // Add event listener
    fileElement.addEventListener('change', event => {
      let target = event.target;
      // If files exists
      if (target.files && target.files[0]) {
        // Display loading screen
        displayLoading(true);
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
              // Obtain the duration in seconds of the audio file (with milliseconds as well, a float value)
              let length = buffer.duration * 1000;
              let duration = new Date(length).toISOString().substr(11 ,8);
              // Set duration info
              document.querySelector('input[type="hidden"][name="length"]').value = length;
              document.querySelector('input[type="hidden"][name="duration"]').value = duration;
              // Hide loading screen
              displayLoading(false);
          });
        }
        // Start file reader as array buffer
        reader.readAsArrayBuffer(target.files[0]);
      }
    });
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
            if (isDefined(message)) {
              // Display message
              displayNotice(message);
            } else if (isDefined(redirectTo)) {
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
}