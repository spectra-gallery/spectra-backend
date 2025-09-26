const { authJwt } = require("../middlewares");
const {objectId} = require('../middlewares');
const controller = require("../controllers/playground.controller");
const asyncWrap = require("../middlewares/asyncWrap");
const uploadController = require("../controllers/fileUpload.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept",
            'x-refresh-token, Origin, Content-Type, Accept',
            "session-token, Origin, Content-Type, Accept",
            'session-refresh, Origin, Content-Type, Accept'
        );
        next();
    });
    /*
    app.get('/api/playground', (req, res) => {
        const elements = controller.fetchSketches();
        elements.then((elements) => {
            res.status(200).send({
                ...elements
            });
        });
    });
    */
    /*
      app.get("/api/playground/:id", (req, res) => {
        const element = controller.fetchSketch(req, res);
        element.then((elementObj) => {
          res.status(200).send({
            ...elementObj
          });
        });
      });
    */

      // generateSketchId
    app.get('/api/playground/generate', asyncWrap(controller.generateSketchId));


    app.get('/api/playground/sketch/:id', [objectId.isValidObjectId], asyncWrap(controller.getSketchById));

    app.post("/api/playground/autosave", asyncWrap(controller.autoSaveSketch));

    // delete sketch by id
    app.delete("/api/playground/delete/:id", asyncWrap(controller.deleteSketchById));

    app.get('/api/playground/tag', asyncWrap(async (req, res) => {
        const elements = await controller.fetchTag();
        res.status(200).send({ ...elements });
    }));

    app.get('/api/attribute', asyncWrap(async (req, res) => {
        const elements = await controller.fetchAttribute();
        res.status(200).send({ ...elements });
    }));

    // minifyCode
    app.post('/api/playground/minify', [authJwt.verifySession], asyncWrap(controller.minifyCode));

    // getSketchesByUserId
    app.get('/api/playground/user', [authJwt.verifyToken], asyncWrap(controller.getSketchesByUserId));

    // saveSketch
    app.post('/api/playground/save', [authJwt.verifyToken], asyncWrap(controller.saveSketch));

   // app.post("/api/playground", [authJwt.verifyToken, authJwt.getUsername], controller.createSketch);

   // app.post("/api/playground/comment/:id", [authJwt.verifyToken, authJwt.getUsername], controller.commentSketch);

    // app.post("/api/playground/like/:id", [authJwt.verifyToken, authJwt.getUsername], controller.likeSketch);

    // app.post("/api/playground/edit/:id", [authJwt.verifyToken, authJwt.getUsername], controller.editSketch);

   // app.delete("/api/playground/:id", [authJwt.verifyToken, authJwt.getUsername], controller.deleteSketch);
};
