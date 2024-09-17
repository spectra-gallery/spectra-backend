const { authJwt } = require("../middlewares");
const controller = require("../controllers/article.controller");
const uploadController = require("../controllers/fileUpload.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept",
      "session-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/article", (req, res) => {
    const elements = controller.fetchArticles();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get("/api/article/:id", (req, res) => {
    const element = controller.fetchArticle(req, res);
    element.then((elementObj) => {
      res.status(200).send({
        ...elementObj,
      });
    });
  });

  app.get("/api/article/sections/:id", (req, res) => {
    const elements = controller.fetchSections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get("/api/article/section/:id", (req, res) => {
    const element = controller.fetchSection(req, res);
    element.then((elementObj) => {
      res.status(200).send({
        ...elementObj,
      });
    });
  });

  app.get("/api/category", (req, res) => {
    const elements = controller.fetchCategory();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.post(
    "/api/article/img",
    [authJwt.verifyToken],
    uploadController.uploadMatterImg
  );

  app.post(
    "/api/article",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.createArticle
  );

  app.post(
    "/api/article/section",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.createSection
  );

  app.post(
    "/api/article/section/edit/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.editSection
  );

  app.post(
    "/api/article/comment/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.commentArticle
  );

  app.post(
    "/api/article/like/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.likeArticle
  );

  app.post(
    "/api/article/edit/:id",
    [authJwt.verifyToken],
    controller.editArticle
  );

  app.delete(
    "/api/article/:id",
    [authJwt.verifyToken],
    controller.deleteArticle
  );

  app.delete(
    "/api/category/:id",
    [authJwt.verifyToken],
    controller.deleteCategory
  );
};
