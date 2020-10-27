
function podcastsSetup() {
    
}

function newPodcastSetup() {
    // Set datepicker 
    let element = document.querySelector('[data-behavior~="datetime-picker"]');
    
    $(element).datetimepicker({
        locale: 'en',
        format: 'ddd, D MMM YYYY HH:mm:ss',
        stepping: 15,
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
    // Set fileupload 
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
}

function showPodcastSetup() {
    
}