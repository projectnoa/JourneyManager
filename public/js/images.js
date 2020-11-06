
function imagesSetup() {
    // Collapsible behavior
    // Show
    $('.collapse').on('show.bs.collapse', (event) => {
        let target = event.target;

        event.target.parentElement.querySelector('i').classList.remove('fa-angle-down');
        event.target.parentElement.querySelector('i').classList.add('fa-angle-up');
    });
    // Hide
    $('.collapse').on('hide.bs.collapse', (event) => {
        let target = event.target;

        event.target.parentElement.querySelector('i').classList.remove('fa-angle-up');
        event.target.parentElement.querySelector('i').classList.add('fa-angle-down');
    });
    // Dropzone
    let elements = document.querySelectorAll('[data-behavior~="post-images"]');
    elements.forEach(element => new Dropzone(element, { 
        url: `/images/createImage`,
        paramName: "multi-files",
        params: { collection_id: element.dataset.id },
        maxFilesize: 3, 
        uploadMultiple: true,
        parallelUploads: 3,
        createImageThumbnails: false,
        resizeWidth: 600,
        resizeMimeType: 'image/jpeg',
        acceptedFiles: 'image/*',
        enctype: "multipart/form-data"
    }));
    
    elements = document.querySelectorAll('[data-behavior~="cover-image"]');
    elements.forEach(element => new Dropzone(element, { 
        url: `/images/createCover`,
        paramName: "multi-files",
        params: { collection_id: element.dataset.id },
        maxFilesize: 1, 
        uploadMultiple: false,
        parallelUploads: 1,
        createImageThumbnails: false,
        resizeWidth: 1500,
        resizeMimeType: 'image/jpeg',
        acceptedFiles: 'image/*',
        enctype: "multipart/form-data"
    }));
}

function newImagesSetup() {

}