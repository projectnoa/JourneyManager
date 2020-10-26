
function podcastsSetup() {
    
}

function newPodcastSetup() {
    let element = document.querySelector('[data-behavior~="datetime-picker"]');
    
    $(element).datetimepicker({
        locale: 'en',
        format : 'YYYY-MM-DD HH:mma',
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
}

function showPodcastSetup() {
    
}