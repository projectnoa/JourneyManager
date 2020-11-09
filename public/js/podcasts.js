
function podcastsSetup() {
    
}

function newPodcastSetup() {
    // Set datepicker 
    let element = document.querySelector('[data-behavior~="datetime-picker"]');
    
    var date = new Date();
    date.setHours(09);
    date.setMinutes(00);
    date.setSeconds(00);

    $(element).datetimepicker({
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
    // Set File upload 
    element = document.querySelector('[data-behavior~="file-upload"]');

    element.addEventListener('change', (event) => {
      let target = event.target;

      if (target.files && target.files[0]) {
        // Display loading screen
        displayLoading(true);

        let reader = new FileReader();
          
        reader.onload = (e) => {
          let arrayBuffer = e.target.result;
          let fileName = target.files[0].name;

          target.setAttribute("data-title", fileName);

          // Create an instance of AudioContext
          var audioContext = new (window.AudioContext || window.webkitAudioContext)();

          // Asynchronously decode audio file data contained in an ArrayBuffer.
          audioContext.decodeAudioData(arrayBuffer, (buffer) => {
              // Obtain the duration in seconds of the audio file (with milliseconds as well, a float value)
              let length = buffer.duration * 1000;
              let duration = new Date(length).toISOString().substr(11 ,8);
              
              document.querySelector('input[type="hidden"][name="length"]').value = length;
              document.querySelector('input[type="hidden"][name="duration"]').value = duration;

              // Display loading screen
              displayLoading(false);
          });
        }

        reader.readAsArrayBuffer(target.files[0]);
      }
    });
    // Set form validation
    setPodcastFormValidationBehavior();
    // Set form submition
    document.querySelector('form')
    .addEventListener('submit', event => {
      // Store reference to form to make later code easier to read
      const target = event.target;

      var isValid = $(target).valid();

      if (isValid) {
        // Post data using the Fetch API
        fetch(target.action, {
          method: target.method,
          body: new FormData(target)
        })
        .then(response => response.json())
        .then(data => {
          console.log(data);
          // Hide loading screen 
          displayLoading(false);
          if (isDefined(data.message)) {
            // Display error
            displayNotice(data.message);
          } else if (isDefined(data.redirectTo)) {
            // Redirect on success
            window.location.href = data.redirectTo;
          }
        })
        .catch(err => {
          console.log(err);
          // Hide loading screen 
          displayLoading(false);
          // Display error
          displayNotice(err);
        });
        // Prevent the default form submit
        event.preventDefault();
        // Display loading screen
        displayLoading(true);
      }
    });
}