const authJwt = require('./authJwt');
const authInit = require('./authInit');
const authAPI = require('./authAPI');
const sudoCypher = require('./sudoCypher');
const verifySignUp = require('./verifySignUp');
const verifySerie = require('./verifySerie');
const verifyPost = require('./verifyPost');
const verifyPortfolio = require('./verifyPortfolio');
const verifyProperty = require('./verifyProperty');
const objectId = require('./isValidObjectId');
const event = require('./event');
const uploadFileMiddleware = require('./upload');
const storageUpload = require('./storageUpload');
const generateImg = require('./generateImg');
const generatePreview = require('./generatePreview');
const parseHtml = require('./parseHtml');
const mail = require('./mail');
// const discord = require('./discord');

module.exports = {
  authJwt,
  authInit,
  authAPI,
  sudoCypher,
  verifySignUp,
  verifySerie,
  verifyPost,
  verifyPortfolio,
  verifyProperty,
  objectId,
  event,
  uploadFileMiddleware,
  storageUpload,
  generateImg,
  generatePreview,
  parseHtml,
  mail,
  // discord,
};
