/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const controller = require('../controllers/gallery.controller');
const uploadController = require('../controllers/filesUpload.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
    );
    next();
  });

  app.post('/api/gallery/img', [authJwt.verifyToken], uploadController.multipleUpload);

  // create collection
  app.post('/api/gallery', [authJwt.verifyToken], controller.createGallery);


  // get all collections by page
  app.get('/api/gallery/get/:page', (req, res) => {
    const elements = controller.fetchGalleries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get collection by id
  app.get('/api/galleryid/:id', (req, res) => {
    const elements = controller.fetchGalleryById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get collection by artist
  app.get('/api/gallery/artist/:id', (req, res) => {
    const elements = controller.fetchGalleryByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // usersGallery
  app.get('/api/gallery/user', [authJwt.verifyToken], (req, res) => {
    const elements = controller.usersGallery(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // userGalleryById
  app.get('/api/gallery/userid/:id', [authJwt.verifyToken], (req, res) => {
    const elements = controller.userGalleryById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });


  // load category
  app.get('/api/tag/', (req, res) => {
    const elements = controller.fetchTag();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // setGalleryExhibition
  app.post('/api/gallery/exhibition/:id', [authJwt.verifyToken], controller.setGalleryExhibition);

  // set views
  app.post('/api/gallery/views/:id', controller.setViews);

  // edit collection
  app.post('/api/gallery/edit/:id', [authJwt.verifyToken], controller.editGallery);


  app.post('/api/gallery/like/:id', [authJwt.verifyToken], controller.likeGallery);


  // delete collection
  app.delete('/api/gallery/:id', [authJwt.verifyToken], controller.deleteGallery);
};
