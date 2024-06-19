const util = require('util');
const multer = require('multer');

require('dotenv').config();
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, __basedir + '/ressources/api/gallery/');
  },
  filename: (req, file, callback) => {
    const match = ['image/png', 'image/jpeg', 'image/jpg',
      'image/gif', 'imgage/webp'];

    if (match.indexOf(file.mimetype) === -1) {
      const message = `${file.originalname} is invalid. Only accept png/jpeg.`;
      return callback(message, null);
    }

    const newName = file.originalname.replace(/\s/g, '');
    console.log(newName);

    const filename = `${Date.now()}-function-${newName}`;
    callback(null, filename);
  },
});

const uploadFiles = multer({storage: storage, limits: {fileSize: MAX_SIZE}} )
    .array('multi-files', 10);
const uploadFilesMiddleware = util.promisify(uploadFiles);
module.exports = uploadFilesMiddleware;
