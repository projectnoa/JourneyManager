
const { compress } = require('compress-images/promise');

const INPUT_PATH = 'uploads/*.{jpg,JPG,jpeg,JPEG,png}';
const OUTPUT_PATH = 'uploads/processed/';

const compressImages = () => {
    return compress({
        source: INPUT_PATH,
        destination: OUTPUT_PATH,
        enginesSetup: {
            jpg: { engine: 'mozjpeg', command: ['-quality', '60']},
            png: { engine: 'pngquant', command: ['--quality=20-50', '-o']},
        }
    });
};

module.exports = compressImages;