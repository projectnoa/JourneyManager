import { promisify } from "util";
import { join } from "path";
import multer, { diskStorage } from "multer";

import { getDirName } from './helper.js';

let storage = diskStorage({
  destination: (req, file, callback) => {
    callback(null, join(`${getDirName(import.meta.url)}/../uploads`));
  },
  filename: (req, file, callback) => {
    const match = ["image/png", "image/jpeg"];

    if (match.indexOf(file.mimetype) === -1) {
      let message = `${file.originalname} is invalid. Only accept png/jpeg.`;
      
      return callback(message, null);
    }

    let filename = `${Date.now()}-ajfw-${file.originalname}`;

    callback(null, filename);
  }
});

let uploadFiles = multer({ storage: storage }).single("file");
let uploadImageMiddleware = promisify(uploadFiles);
export default uploadImageMiddleware;