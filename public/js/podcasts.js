
function podcastsSetup() {
    
}

function newPodcastSetup() {
    // Set datepicker 
    let element = document.querySelector('[data-behavior~="datetime-picker"]');
    
    $(element).datetimepicker({
        locale: 'en',
        format: 'M/D/YYYY hh:mm a',
        minDate: new Date(),
        defaultDate: new Date(),
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
          let reader = new FileReader();
          
          reader.onload = (e) => {
            let fileData = e.target.result;
            let fileName = target.files[0].name;

            target.setAttribute("data-title", fileName);
          }

          reader.readAsDataURL(target.files[0]);
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

function showPodcastSetup() {
    
}