
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
          // If message exists
          if (isDefined(response.message)) {
            // Display message
            displayNotice(response.message);
          } else if (isDefined(response.redirectTo)) {
            // Redirect on success
            window.location.href = response.redirectTo;
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
}