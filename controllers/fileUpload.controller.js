const uploadFile = require('../middlewares/upload');
const uploadHtml = require('../middlewares/uploadHtml');
const generateImg = require('../middlewares/generateImg');
const generatePreview = require('../middlewares/generatePreview');
const fs = require('fs');

const sharp = require('sharp');

const db = require('../models');
require('dotenv').config();
const Sketch = db.sketch;
const Recursion = db.recursion;
const User = db.user;

const USER_STORAGE = process.env.USER_STORAGE;
const UPLOAD_PATH = process.env.UPLOAD_PATH;
const RESIZE_TRESHOLD = parseInt(process.env.RESIZE_TRESHOLD);

const uploadMatterImg = async (req, res) => {
  const directoryPath = USER_STORAGE;


  try {
    await uploadFile(req, res);

    if (req.file === undefined) {
      return res.status(400).send({message: 'upload a file'});
    }

    let filePath = directoryPath + req.file.filename;
    const fileSizeInBytes = req.file.size;
    const twoMegabytesInBytes = RESIZE_TRESHOLD; // 2 MB in bytes

    if (fileSizeInBytes > twoMegabytesInBytes) {
      const resizedImagePath = __basedir + UPLOAD_PATH +
      'user/' + 'resize-' + req.file.filename;

      // Resize the image using sharp
      await sharp(req.file.path)
          .resize(600) // Resize to 800x800 pixels or any size you prefer
          .toFile(resizedImagePath);

      // Update the filePath to point to the resized image
      filePath = directoryPath + 'resize-' + req.file.filename;

      // Delete the original file
      fs.unlinkSync(req.file.path, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }

    res.status(200).send({
      imageUrl: filePath,
    });
  } catch (err) {
    console.log(err);
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'File too large',
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const htmlUpload = async (req, res) => {
  // const directoryPath = baseUrl + "collection/";

  const directoryPath = 'api/collection/';

  try {
    await uploadHtml(req, res);

    if (req.file === undefined) {
      return res.status(400).send({message: 'upload a file'});
    }

    // decode req.file fromdata to string
    const htmlContent = fs.readFileSync(req.file.path, 'utf8');

    const filePath = directoryPath + req.file.filename;

    // save sketch content to db
    const sketch = new Sketch({
      htmlContent: htmlContent,
      url: filePath,
      hash: '',
      sizeBytes: req.file.size,
    });

    await sketch.save();


    res.status(200).send({
      id: sketch._id,
      fileUrl: filePath,
      htmlContent: htmlContent,
    });
  } catch (err) {
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'File too large',
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};


const htmlToImg = async (req, res) => {
  await generateImg.generateImg(req, res);
};

const previewToImg = async (previewUrl, captureDelay, cssSelector, hash) => {
  const data = await generatePreview
      .generatePreview(previewUrl, captureDelay, cssSelector, hash);
  return data;
};

const rawPreviewToImg = async (previewUrl, captureDelay, hash) => {
  const data = await generatePreview
      .generateRawPreview(previewUrl, captureDelay, hash);
  return data;
};


module.exports = {
  uploadMatterImg,
  htmlUpload,
  htmlToImg,
  previewToImg,
  rawPreviewToImg,
};
