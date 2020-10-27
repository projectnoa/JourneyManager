
exports.fileFilter = function(req, file, cb) {
    // Accept mp3 files only
    if (!file.originalname.match(/\.(mp3)$/)) {
        req.fileValidationError = 'Only mp3 files are allowed!';

        return cb(new Error('Only mp3 files are allowed!'), false);
    }

    cb(null, true);
};

exports.isDefined = (object) => {
    return (object != undefined && object != null);
}