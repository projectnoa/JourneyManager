
var setPodcastFormValidationBehavior = () => {
    let form = document.querySelector('form[action="/podcasts/create"]');

    $(form).validate({
        debug: false,
        rules: {
            "title": {
                required: true,
                rangelength: [10, 200]
            },
            "description": {
                required: true,
                rangelength: [10, 5000]
            },
            "keywords": {
                required: true,
                rangelength: [4, 200]
            },
            "file": {
                required: true
            },
            "pubDate": {
                required: true
            }
        },
        showErrors: showValidationErrors
    });
};

var setPostFormValidationBehavior = () => {
    let form = document.querySelector('form[action="/posts/create"]');

    $(form).validate({
        debug: false,
        rules: {
            "title": {
                required: true,
                rangelength: [10, 200]
            },
            "excerpt": {
                required: false,
                rangelength: [10, 1000]
            },
            "keywords": {
                required: true,
                rangelength: [4, 200]
            }
        },
        showErrors: showValidationErrors
    });
};

let showValidationErrors = function (errorMap, errorList) {
    this.successList.forEach(item => $(item).popover('hide'));

    errorList.forEach(item => {
        let _popover = $(item.element).popover({
            trigger: 'manual',
            placement: 'top',
            content: item.message,
            template: '<div class="popover validation" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
        });

        $(item.element).popover('show');
    });
};