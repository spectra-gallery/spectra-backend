/* eslint-disable max-len */
const { authJwt } = require('../middlewares');
const { objectId } = require('../middlewares');
const controller = require('../controllers/print.controller');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'x-access-token, Origin, Content-Type, Accept',
            'session-token, Origin, Content-Type, Accept',
        );
        next();
    });

    // createPrintPaymentIntent
    app.post('/api/print/intent/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.createPrintPaymentIntent);

    // getCountryList
    app.get('/api/print/countries', [authJwt.verifyToken], controller.getCountryList);

    // getCountryInfo
    app.get('/api/print/country/:code', [authJwt.verifyToken], controller.getCountryInfo);

    // getCountryCode
    app.get('/api/print/countrycode', [authJwt.verifyToken], controller.getCountryCode);

    // calculatePaperWeight
    app.get('/api/print/weight', [authJwt.verifyToken], controller.calculatePaperWeight);

    // getPaperPrintPrice
    app.get('/api/print/price', [authJwt.verifyToken], controller.getPaperPrintPrice);

    // generatePrint
    app.post('/api/print/generate', [authJwt.verifyToken], controller.generatePrint);
};
