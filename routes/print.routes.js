/* eslint-disable max-len */
const { authJwt } = require('../middlewares');
const { objectId } = require('../middlewares');
const controller = require('../controllers/print.controller');
const asyncWrap = require('../middlewares/asyncWrap');
const shipping = require('../controllers/shipping.controller');

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

    // createPrintPaymentIntent
    app.post('/api/print/intent/:id', [authJwt.verifyToken, objectId.isValidObjectId], asyncWrap(controller.createPrintPaymentIntent));

    // getCountryList
    app.get('/api/print/countries', [authJwt.verifyToken], asyncWrap(controller.getCountryList));

    // getCountryInfo
    app.get('/api/print/country/:code', [authJwt.verifyToken], asyncWrap(controller.getCountryInfo));

    // getCountryCode
    app.get('/api/print/countrycode', [authJwt.verifyToken], asyncWrap(controller.getCountryCode));

    // calculatePaperWeight
    app.get('/api/print/weight', [authJwt.verifyToken], asyncWrap(controller.calculatePaperWeight));

    // getPaperPrintPrice
    app.get('/api/print/price', [authJwt.verifyToken], asyncWrap(controller.getPaperPrintPrice));

    // address validation (Swiss Post Address REST)
    app.post('/api/print/address/validate', [authJwt.verifyToken], asyncWrap(controller.validateAddress));

    // generatePrint
    app.post('/api/print/generate', [authJwt.verifyToken], asyncWrap(controller.generatePrint));

    // Swiss Post Digital Commerce (configurable endpoints) — optional
    app.post('/api/shipping/orders', [authJwt.verifyToken], asyncWrap(shipping.createOrder));
    app.post('/api/shipping/orders/:orderKey/approval', [authJwt.verifyToken], asyncWrap(shipping.approveOrder));
    app.post('/api/shipping/labels', [authJwt.verifyToken], asyncWrap(shipping.createLabel));
    app.get('/api/shipping/track/:id', [authJwt.verifyToken], asyncWrap(shipping.trackShipment));
};
