/* eslint-disable max-len */
const { authJwt } = require('../middlewares');
const { objectId } = require('../middlewares');
const controller = require('../controllers/element.controller');
const asyncWrap = require('../middlewares/asyncWrap');

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

    // fetchAllElementsByNumber
    app.get('/api/element/all/:number', [authJwt.verifySession], asyncWrap(controller.fetchAllElementsByNumber));

    // get Element by id
    app.get('/api/element/get/:id', [authJwt.verifySession, objectId.isValidObjectId], asyncWrap(controller.fetchElementById));
};
