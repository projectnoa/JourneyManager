
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
    elements.forEach(element => { 
        new Dropzone(element, { 
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
        })
    });
    // Form submit
    let button = document.querySelector('[data-behavior~="submit"]');
    button.addEventListener('click', (event) => {
        let target = event.target;
        let form = target.parentElement.parentElement.querySelector('form');

        form.submit();
    });
}

function newImagesSetup() {
    let element = document.querySelector("input[data-behavior~='cover-load']");
    // On file input change (selected the image)
    element.addEventListener('change',
        (event) => {
            let target = event.target;

            if (target.files && target.files[0]) {
                // Hide uploader
                document.querySelector("[data-behavior~='cover-uploader']").classList.add('d-none');
                // Destroy cropper if existed
                let cropper = document.querySelector("img[data-behavior~='cover-cropper']");
                if (cropper !== undefined) {
                    $(cropper).cropper('destroy');
                }
                // Make controllers visible
                document.querySelector("div[data-behavior~='cover-container']").classList.remove('d-none');
                // Place loading spinner
                document.querySelector("div[data-behavior~='cover-preview']").innerHTML = "<center><i class='fas fa-sync fa-spin'></i></center>";
                // Initialize file reader
                let reader = new FileReader();
                // Add load event
                reader.onload = (event) => {
                    // Place cropper
                    document.querySelector("div[data-behavior~='cover-preview']").innerHTML = "<img data-behavior='cover-cropper' style='max-width: 100%;' src='" + event.target.result + "'>";
                    // Load cropper
                    $("img[data-behavior~='cover-cropper']").cropper({
                        viewMode: 1,
                        dragMode: 'move',
                        aspectRatio: 16 / 9,
                        checkOrientation: true,
                        cropBoxMovable: false,
                        cropBoxResizable: false,
                        ready: () => {
                            // Add rotation event to rotation buttons
                            let rotators = document.querySelectorAll("[data-behavior~='cover-rotate']");
                            rotators.forEach(rotator => 
                                rotator.addEventListener('click',
                                    (rotator_event) => {
                                        let rotator_target = rotator_event.target;
                                        // Get rotation degrees data
                                        const degrees = rotator_target.dataset.deg;
                                        const int_degrees = parseInt(degrees);
                                        // Rotate the image on the cropper
                                        $("img[data-behavior~='cover-cropper']").data('cropper').rotate(int_degrees);
                                    }));
                            // Add submit button
                            document.querySelector("button[data-behavior~='cover-submit']")
                                .addEventListener('click',
                                     (submit_event) => {
                                        // Get cropped image blob
                                        $("img[data-behavior~='cover-cropper']")
                                            .data('cropper')
                                            .getCroppedCanvas()
                                            .toBlob((blob) => {
                                                const formData = new FormData();

                                                // Pass the image file name as the third parameter if necessary.
                                                formData.append('file', blob, 'cover.jpeg');

                                                fetch('/images/process', {
                                                    method: 'POST',
                                                    body: formData
                                                })
                                                .then(response => response.blob())
                                                .then(blob => {
                                                    download(blob);
                                                })
                                                .catch(err => {
                                                    console.log(err);
                                                    // Hide loading screen 
                                                    displayLoading(false);
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