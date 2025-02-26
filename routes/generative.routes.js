const { authJwt } = require("../middlewares");
const {objectId} = require('../middlewares');
const controller = require("../controllers/generative.controller");
const uploadController = require("../controllers/fileUpload.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept",
            'x-refresh-token, Origin, Content-Type, Accept',
            "sessionId, Origin, Content-Type, Accept",
            'session-refresh, Origin, Content-Type, Accept'
        );
        next();
    });

    // getProjects
    app.get('/api/generative/projects/:number', [authJwt.verifySession], controller.getProjects);

    // loadNft
    app.get('/api/generative/nft/:number', [authJwt.verifySession], controller.loadNft);

    // createNft   
    app.post('/api/generative/nft/create/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.createNft);

    // listenForMint
    app.post('/api/generative/mint/listen', [authJwt.verifySession], controller.listenForMint);

};