
var setupUploader = () => {
  // Set show collapsible behavior
  $('.collapse').on('show.bs.collapse', (event) => {
      let target = event.target;
      // Get container card
      let containerCard = target.parentElement;
      // Flip collapse arrow
      containerCard.querySelector('i[class~="fa-2x"]').classList.remove('fa-angle-down');
      containerCard.querySelector('i[class~="fa-2x"]').classList.add('fa-angle-up');
      // Get dropzone elements
      let dropzoneElement = target.querySelector('[data-behavior~="post-recordings"]');
      // Check if initialized
      if (dropzoneElement.dataset.initialized) return;
      // Initialize config
      let config = { 
        url: `/recordings/create`,
        params: { collection_id: dropzoneElement.dataset.id },
        maxFilesize: 150, 
        uploadMultiple: false,
        parallelUploads: 1,
        createImageThumbnails: false,
        acceptedFiles: 'audio/mpeg',
        enctype: "multipart/form-data",
        autoProcessQueue: false,
        init: function () {
          // On file added
          this.on("addedfile", (file) => {
            // Update title
            var dropzone = file.previewElement.parentElement;
            var fileTitle = file.name;
            dropzone.dataset.title = `Processing recording ${fileTitle}`;
            // Calculate audio duration
            getAudioDuration(file, () => {
              // Update title
              var dropzone = document.querySelector('div[data-behavior~="post-recordings"] > div').parentElement;
              dropzone.dataset.title = `Uploading recording ${fileTitle}`;
              // Process queue
              Dropzone.forElement(dropzone).processQueue();
            });
          });
          // On file uploading
          this.on("sending", (file, xhr, formData) => {
            // Will send the filesize along with the file as POST data.
            formData.append("filesize", file.size);
            formData.append("duration", document.querySelector(`input[type="hidden"][name="duration"]`).value);

            // Display loading screen
            displayLoading(true);
          });
          // On file uploaded
          this.on("complete", (file, event) => {
            // Display loading screen
            displayLoading(false);
            // Redirect
            window.location.href = '/recordings';
          });
        }
    };
    // Set dropzone
    new Dropzone(dropzoneElement, config);
    // Mark as initialized
    dropzoneElement.dataset.initialized = true;
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
};

var getAudioDuration = async (file, callback) => {
  // Hide loading screen
  displayLoading(true);
  // Initialize file reader
  let reader = new FileReader();
  // Set load listener
  reader.onload = (e) => {
    // Get data
    let arrayBuffer = e.target.result;
    let fileName = file.name;
    // Set filename on view
    // target.setAttribute("data-title", fileName);
    // Create an instance of AudioContext
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Asynchronously decode audio file data contained in an ArrayBuffer.
    audioContext
      .decodeAudioData(arrayBuffer)
      .then((buffer) => {
        // Obtain the duration in seconds of the audio file
        let duration = Math.round(buffer.duration);
        // Set duration info
        document.querySelector('input[type="hidden"][name="duration"]').value = duration;
        // Hide loading screen
        displayLoading(false);
        // Execute callback
        callback();
      });
  }
  // Start file reader as array buffer
  reader.readAsArrayBuffer(file);
}

function recordingsSetup() {
  setupUploader();
}