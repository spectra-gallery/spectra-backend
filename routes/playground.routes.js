const { authJwt } = require("../middlewares");
const controller = require("../controllers/playground.controller");
const uploadController = require("../controllers/fileUpload.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept",
            "sessionId, Origin, Content-Type, Accept"
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


    app.get('/api/playground/:id', controller.getSketchById);

    app.post("/api/playground/autosave", controller.autoSaveSketch);

    // delete sketch by id
    app.delete("/api/playground/delete/:id", controller.deleteSketchById);

    app.get('/api/playground/tag', (req, res) => {
        const elements = controller.fetchTag();
        elements.then((elements) => {
            res.status(200).send({
                ...elements
            });
        });
    });

    app.get('/api/attribute', (req, res) => {
        const elements = controller.fetchAttribute();
        elements.then((elements) => {
            res.status(200).send({
                ...elements
            });
        });
    });

   // app.post("/api/playground", [authJwt.verifyToken, authJwt.getUsername], controller.createSketch);

   // app.post("/api/playground/comment/:id", [authJwt.verifyToken, authJwt.getUsername], controller.commentSketch);

    // app.post("/api/playground/like/:id", [authJwt.verifyToken, authJwt.getUsername], controller.likeSketch);

    // app.post("/api/playground/edit/:id", [authJwt.verifyToken, authJwt.getUsername], controller.editSketch);

   // app.delete("/api/playground/:id", [authJwt.verifyToken, authJwt.getUsername], controller.deleteSketch);
};