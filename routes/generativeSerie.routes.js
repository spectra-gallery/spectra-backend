const { authJwt } = require('../middlewares');
const controller = require('../controllers/generativeSerie.controller');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
  });

  // Public routes
  app.get('/api/generative-series', controller.getAllGenerativeSeries);
  app.get('/api/generative-series/:id', controller.getGenerativeSerieById);
  app.get('/api/generative-series/slug/:slug', controller.getGenerativeSerieBySlug);
  app.get('/api/generative-series/artist/:artistId', controller.getGenerativeSeriesByArtist);
  app.get('/api/generative-series/algorithm/:algorithm', controller.getGenerativeSeriesByAlgorithm);
  app.get('/api/generative-series/search', controller.searchGenerativeSeries);

  // Authenticated routes
  app.post('/api/generative-series', [authJwt.verifyToken], controller.createGenerativeSerie);
  app.put('/api/generative-series/:id', [authJwt.verifyToken], controller.updateGenerativeSerie);
  app.delete('/api/generative-series/:id', [authJwt.verifyToken], controller.deleteGenerativeSerie);

  // Rendering and minting routes
  app.post('/api/generative-series/render', [authJwt.verifyToken], controller.renderGenerativeArt);
  app.post('/api/generative-series/mint', [authJwt.verifyToken], controller.mintGenerativeArt);
};