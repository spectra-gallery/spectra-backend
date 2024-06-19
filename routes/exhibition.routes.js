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

  // get all exhibitions
  app.get('/api/exhibition/display', [authJwt.verifySession], controller.getDisplayExhibition);

  // getAllExhibitions
  app.get('/api/exhibition/all', [authJwt.verifyToken, authJwt.isAdmin], controller.getAllExhibitions);

  // getDisplayExhibitionById
  app.get('/api/exhibition/display/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.getDisplayExhibitionById);

  // setExhibitionDisplay
  app.post('/api/exhibition/display/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.setExhibitionDisplay);

  // create collection
  app.post('/api/exhibition/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.createExhibition);

  // deleteExhibition
  app.delete('/api/exhibition', controller.deleteExhibition);
};
