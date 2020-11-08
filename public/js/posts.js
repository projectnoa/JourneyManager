
function postsSetup() {
    
}

function newPostSetup() {
    // Set form validation
    setPostFormValidationBehavior();
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