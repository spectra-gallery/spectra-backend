const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const controller = require('../controllers/draft.controller');

module.exports = function (app) {
  app.use('/api/drafts', (req, res, next) => { req.target = 'drafts'; next(); });

  // Persist/retrieve/remove a draft for the authenticated user
  app.post('/api/drafts/:key', [authJwt.verifyToken], asyncWrap(controller.save));
  app.get('/api/drafts/:key', [authJwt.verifyToken], asyncWrap(controller.get));
  app.delete('/api/drafts/:key', [authJwt.verifyToken], asyncWrap(controller.remove));
};

