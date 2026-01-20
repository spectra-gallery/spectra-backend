/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const controller = require('../controllers/dao.controller');
const asyncWrap = require('../middlewares/asyncWrap');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'x-refresh-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
        'session-refresh, Origin, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    // x-frame-options sameorigin
    res.header('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // getMembershipRequests
    app.get('/api/dao/requests', asyncWrap(controller.getMembershipRequests));

};
