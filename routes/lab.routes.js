const { authJwt } = require("../middlewares");
const {objectId} = require('../middlewares');
const controller = require("../controllers/lab.controller");
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

    // createNeuralmap
    app.post('/api/lab/neuralmap/create', [authJwt.verifyToken], controller.createNeuralmap);

    // createNode
    app.post('/api/lab/node/create/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.createNode);

    // createLink
    app.post('/api/lab/link/create/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.createLink);

    // deleteNode
    app.delete('/api/lab/node/delete/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.deleteNode);

    // createNodes
    app.post('/api/lab/nodes/create/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.createNodes);

    // createLinks
    app.post('/api/lab/links/create/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.createLinks);

    // getMapNames
    app.get('/api/lab/mapnames', [authJwt.verifyToken], controller.getMapNames);

    // getNeuralMaps
    app.get('/api/lab/neuralmaps', [authJwt.verifyToken], controller.getNeuralMaps);

    // getNeuralMap
    app.get('/api/lab/neuralmap/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.getNeuralMap);

    // fetchNodesByMap
    app.get('/api/lab/map/nodes/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.fetchNodesByMap);

    // getNodes
    app.get('/api/lab/nodes', [authJwt.verifyToken], controller.fetchNodes);

    // getLinks
    app.get('/api/lab/links', [authJwt.verifyToken], controller.fetchLinks);  

    // updateNode
    app.post('/api/lab/node/update/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateNode);

    // updateLink
    app.post('/api/lab/link/update/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateLink);

};