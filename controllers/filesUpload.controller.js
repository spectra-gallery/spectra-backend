const upload = require('../middlewares/multipleUpload');
const uploadFile = require('../middlewares/multipleFileUpload');

const db = require('../models');
const Recursion = db.recursion;

require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

const multipleUpload = async (req, res) => {
  // const directoryPath = baseUrl;
  const directoryPath = BASE_URL + 'api/gallery/';

  try {
    await upload(req, res);
    console.log(req.files);
    const filenames = [];

    req.files.forEach((file) => {
      filenames.push(directoryPath + file.filename);
    });

    if (req.files.length <= 0) {
      return res.send(`You must select at least 1 file.`);
    }

    return res.send({
      imageUrls: filenames,
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.send(error.code);
    }
    return res.send(`Error when trying upload many files: ${error}`);
  }
};



const multipleFilesUpload = async (req, res) => {
  // const directoryPath = baseUrl;
  const directoryPath = BASE_URL + 'api/exhibition/';

  try {
    await uploadFile(req, res);
    console.log(req.files);
    const filenames = [];

    req.files.forEach((file) => {
      filenames.push(directoryPath + file.filename);
    });

    if (req.files.length <= 0) {
      return res.send(`You must select at least 1 file.`);
    }

    return res.send({
      mediaUrls: filenames,
    });
  } catch (error) {
    console.log(error);

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.send(error.code);
    }
    return res.send(`Error when trying upload many files: ${error}`);
  }
};

module.exports = {
  multipleUpload: multipleUpload,
  multipleFilesUpload: multipleFilesUpload,
};
