/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const controller = require('../controllers/gallery.controller');
const asyncWrap = require('../middlewares/asyncWrap');
const uploadController = require('../controllers/filesUpload.controller');

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

  app.post('/api/gallery/img', [authJwt.verifyToken], asyncWrap(uploadController.multipleUpload));

  // create collection
  app.post('/api/gallery', [authJwt.verifyToken], asyncWrap(controller.createGallery));


  // get all collections by page
  app.get('/api/gallery/get/:page', asyncWrap(async (req, res) => {
    const data = await controller.fetchGalleries(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // get collection by id
  app.get('/api/galleryid/:id', asyncWrap(async (req, res) => {
    const data = await controller.fetchGalleryById(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // get collection by artist
  app.get('/api/gallery/artist/:id', asyncWrap(async (req, res) => {
    const data = await controller.fetchGalleryByArtist(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // usersGallery
  app.get('/api/gallery/user', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const data = await controller.usersGallery(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // userGalleryById
  app.get('/api/gallery/userid/:id', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const data = await controller.userGalleryById(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));


  // load category
  app.get('/api/tag/', asyncWrap(async (req, res) => {
    const data = await controller.fetchTag();
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // setGalleryExhibition
  app.post('/api/gallery/exhibition/:id', [authJwt.verifyToken], asyncWrap(controller.setGalleryExhibition));

  // set views
  app.post('/api/gallery/views/:id', asyncWrap(controller.setViews));

  // edit collection
  app.post('/api/gallery/edit/:id', [authJwt.verifyToken], asyncWrap(controller.editGallery));


  app.post('/api/gallery/like/:id', [authJwt.verifyToken], asyncWrap(controller.likeGallery));


  // delete collection
  app.delete('/api/gallery/:id', [authJwt.verifyToken], asyncWrap(controller.deleteGallery));
};
