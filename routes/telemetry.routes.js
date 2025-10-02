const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const controller = require('../controllers/telemetry.controller');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept',
      'x-refresh-token, Origin, Content-Type, Accept',
      'session-token, Origin, Content-Type, Accept',
      'session-refresh, Origin, Content-Type, Accept'
    );
    next();
  });

  app.use('/api/telemetry', (req, res, next) => { req.target = 'telemetry'; next(); });

  // capture is session-based, allow anonymous (session middleware still runs)
  app.post('/api/telemetry', asyncWrap(controller.capture));
  // query requires auth
  app.get('/api/telemetry', [authJwt.verifyToken], asyncWrap(controller.query));
};

