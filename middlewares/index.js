const authJwt = require('./authJwt');
const verifySignUp = require('./verifySignUp');
const verifySerie = require('./verifySerie');
const verifyPost = require('./verifyPost');
const verifyPortfolio = require('./verifyPortfolio');
const objectId = require('./isValidObjectId');
const uploadFileMiddleware = require('./upload');
const storageUpload = require('./storageUpload');
const generateImg = require('./generateImg');
const generatePreview = require('./generatePreview');
const parseHtml = require('./parseHtml');
const mail = require('./mail');
// const discord = require('./discord');

module.exports = {
  authJwt,
  verifySignUp,
  verifySerie,
  verifyPost,
  verifyPortfolio,
  objectId,
  uploadFileMiddleware,
  storageUpload,
  generateImg,
  generatePreview,
  parseHtml,
  mail,
  // discord,
};
