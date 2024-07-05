/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const controller = require('../controllers/exhibition.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
    );
    next();
  });

  // slugToId
  app.get('/api/exhibition/slug/:slug', controller.slugToId);

  // get all exhibitions
  app.get('/api/exhibition/display/:number', [authJwt.verifySession], controller.getDisplayExhibition);

  // get exhibition by artist
  app.get('/api/exhibition/artist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.getExhibitionByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchPalette
  app.get('/api/exhibition/palette', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchPalette();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getExhibitionById
  app.get('/api/exhibition/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.getExhibitionById);

  // create collection
  app.post('/api/exhibition', [authJwt.verifyToken], controller.createExhibition);

  // edit exhibition name
  app.put('/api/exhibition/name/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editExhibitionName);

  // edit exhibition headline
  app.put('/api/exhibition/headline/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editExhibitionHeadline);

  // edit exhibition description
  app.put('/api/exhibition/description/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editExhibitionDescription);

  // edit exhibition opening
  app.put('/api/exhibition/opening/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editExhibitionOpening);

  // edit exhibition closing
  app.put('/api/exhibition/closing/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editExhibitionClosing);

  // set exhibition display
  app.post('/api/exhibition/display/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.setExhibitionDisplay);

  // review exhibition
  app.post('/api/exhibition/review/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.reviewExhibition);

  // update palette
  app.post('/api/exhibition/palette/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updatePalette);

  // add Serie
  app.post('/api/exhibition/serie/add/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.addSerie);

  // likeExhibition
  app.post('/api/exhibition/like/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.likeExhibition);

  // remove Serie
  app.delete('/api/exhibition/serie/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeSerie);

  // remove color by exhibition id and colorId
  app.delete('/api/exhibition/color/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeColor);

};
