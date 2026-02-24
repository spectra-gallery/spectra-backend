const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const controller = require('../controllers/analytics.controller');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // Public summary (non-sensitive counts and top-likes)
  app.get('/api/analytics', asyncWrap(controller.summary));

  // Daily counts by type (post|podcast|exhibition|serie)
  app.get('/api/analytics/daily', asyncWrap(controller.daily));

  // Top artists by contributions across posts+podcasts+series
  app.get('/api/analytics/top-artists', asyncWrap(controller.topArtists));

  // Weekly counts by type
  app.get('/api/analytics/weekly', asyncWrap(controller.weekly));

  // Per-artist daily contributions (combined)
  app.get('/api/analytics/artist/daily', asyncWrap(controller.artistDaily));
};
