/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const uploadController = require('../controllers/fileUpload.controller');

const multer = require('multer');
const upload = multer({dest: 'ressources/'});

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'x-refresh-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
        'session-refresh, Origin, Content-Type, Accept'
    );
    next();
  });


  app.post('/api/matter/img', [authJwt.verifyToken], uploadController.uploadMatterImg);
  app.post('/api/fleek/upload', upload.single('file'), uploadController.fleekUpload);
  app.post('/api/aws/upload', upload.single('file'), uploadController.s3Upload);

  app.post('/api/nft/generate', uploadController.htmlToImg);
};
