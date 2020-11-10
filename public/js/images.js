
function imagesSetup() {
    // Set show collapsible behavior
    $('.collapse').on('show.bs.collapse', (event) => {
        let target = event.target;
        // Get container card
        let containerCard = target.parentElement;
        // Flip collapse arrow
        containerCard.querySelector('i[class~="fa-2x"]').classList.remove('fa-angle-down');
        containerCard.querySelector('i[class~="fa-2x"]').classList.add('fa-angle-up');
        // Get dropzone elements
        let dropzoneElement = target.querySelector('[data-behavior~="post-images"]');
        // Check if initialized
        if (dropzoneElement.dataset.initialized) {
            // Do nothing
        } else {
            // Set dropzone
            new Dropzone(dropzoneElement, { 
                url: `/images/createImage`,
                paramName: "file",
                params: { collection_id: element.dataset.id },
                maxFilesize: 1, 
                uploadMultiple: false,
                parallelUploads: 1,
                createImageThumbnails: false,
                resizeWidth: 600,
                resizeMimeType: 'image/jpeg',
                acceptedFiles: 'image/*',
                enctype: "multipart/form-data"
            }).on("sending", (file, xhr, formData) => {
                // Will send the filesize along with the file as POST data.
                formData.append("filesize", file.size);

                // Display loading screen
                displayLoading(true);
            }).on("complete", (file, event) => {
                // Display loading screen
                displayLoading(false);

                window.location.href = '/images'
            });
            // Mark as initialized
            dropzoneElement.dataset.initialized = true;
        }
        // Get unloaded images
        let unloadedImages = target.querySelectorAll('img[data-src]');
        // Load images
        unloadedImages.forEach(unloadedImage => { 
            unloadedImage.src = unloadedImage.dataset.src;
            unloadedImage.removeAttribute('data-src');
        });
    });
    // Set hide collapsible behavior
    $('.collapse').on('hide.bs.collapse', (event) => {
        let target = event.target;
        // Get container card
        let containerCard = target.parentElement;
        // Flip collapse arrow
        containerCard.querySelector('i[class~="fa-2x"]').classList.remove('fa-angle-up');
        containerCard.querySelector('i[class~="fa-2x"]').classList.add('fa-angle-down');
    });
    // Get form submit button
    let button = document.querySelector('[data-behavior~="submit"]');
    // Add event listener
    button.addEventListener('click', event => {
        let target = event.target;
        // Get form
        let form = target.parentElement.parentElement.querySelector('form');
        // Submit form
        form.submit();
    });
}

function newImagesSetup() {
    // Get file element
    let fileElement = document.querySelector("input[data-behavior~='cover-load']");
    // Add event listener
    fileElement.addEventListener('change', event => {
        let target = event.target;
        // If there is a file
        if (target.files && target.files[0]) {
            // Hide uploader container
            containerElement().classList.add('d-none');
            // Get cropper element
            let cropperImage = cropperImageElement();
            // Destroy cropper if existed
            if (cropperImage !== undefined) {
                $(cropperImage).cropper('destroy');
            }
            // Make cropper container visible
            cropperContainerElement().classList.remove('d-none');
            // Place loading spinner
            previewElement().innerHTML = '<center><i class="fas fa-sync fa-spin"></i></center>';
            // Initialize file reader
            let reader = new FileReader();
            // Add load event
            reader.onload = e => {
                let subTarget = e.target;
                // Place cropper
                previewElement().innerHTML = `<img data-behavior="cover-cropper" style="max-width: 100%;" src="${subTarget.result}">`;
                // Load cropper
                $(cropperImageElement()).cropper({
                    viewMode: 1,
                    dragMode: 'move',
                    aspectRatio: 16 / 9,
                    checkOrientation: true,
                    cropBoxMovable: false,
                    cropBoxResizable: false,
                    ready: () => {
                        // Add rotation event to rotation buttons
                        rotatorElements().forEach(rotator => 
                            rotator.addEventListener('click',
                                rotator_event => {
                                    let rotator_target = rotator_event.target;
                                    // Get rotation degrees data
                                    const degrees = rotator_target.dataset.deg;
                                    const int_degrees = parseInt(degrees);
                                    // Rotate the image on the cropper
                                    $(cropperImageElement()).data('cropper').rotate(int_degrees);
                                }));
                        // Add submit button
                        cropperSubmitElement()
                            .addEventListener('click',
                                    (submit_event) => {
                                    // Display loading screen
                                    displayLoading(true);
                                    // Get cropped image blob
                                    $(cropperImageElement())
                                        .data('cropper')
                                        .getCroppedCanvas()
                                        .toBlob((blob) => {
                                            // Create form data
                                            const formData = new FormData();
                                            formData.append('file', blob, 'cover.jpeg');
                                            // Make request
                                            axios.post(
                                                '/images/process', 
                                                formData, 
                                                {
                                                    timeout: 300000,
                                                    responseType: 'blob'
                                                }
                                            )
                                            .then(response => {
                                                // Hide loading screen
                                                displayLoading(false);
                                                // Download data
                                                download(response.data);
                                            })
                                            .catch(err => {
                                                // Hide loading screen
                                                displayLoading(false);
                                                // Log error
                                                console.log(err);
                                                // Display error
                                                displayNotice(err);
                                            });
                                        }, 'image/jpeg');
                                });
                    }
                });
            };
            // Trigger image load from input
            reader.readAsDataURL(target.files[0]);
        } else {
            // Not supported
            displayNotice(getVariableFor('This browser is not supported'));
        }
    });
}

var containerElement = () => {
    return document.querySelector("[data-behavior~='cover-uploader']");
}

var cropperImageElement = () => {
    return document.querySelector("img[data-behavior~='cover-cropper']");
}

var cropperContainerElement = () => {
    return document.querySelector("div[data-behavior~='cover-container']");
}

var previewElement = () => {
    return document.querySelector("div[data-behavior~='cover-preview']");
}

var rotatorElements = () => {
    return document.querySelectorAll("[data-behavior~='cover-rotate']");
}

var cropperSubmitElement = () => {
    return document.querySelector("button[data-behavior~='cover-submit']");
}