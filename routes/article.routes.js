const { authJwt } = require("../middlewares");
const controller = require("../controllers/article.controller");
const asyncWrap = require("../middlewares/asyncWrap");
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

  app.get("/api/article", asyncWrap(async (req, res) => {
    const elements = await controller.fetchArticles();
    res.status(200).send({ ...elements });
  }));

  app.get("/api/article/:id", asyncWrap(async (req, res) => {
    const elementObj = await controller.fetchArticle(req, res);
    res.status(200).send({ ...elementObj });
  }));

  app.get("/api/article/sections/:id", asyncWrap(async (req, res) => {
    const elements = await controller.fetchSections(req, res);
    res.status(200).send({ ...elements });
  }));

  app.get("/api/article/section/:id", asyncWrap(async (req, res) => {
    const elementObj = await controller.fetchSection(req, res);
    res.status(200).send({ ...elementObj });
  }));

  app.get("/api/category", asyncWrap(async (req, res) => {
    const elements = await controller.fetchCategory();
    res.status(200).send({ ...elements });
  }));

  app.post(
    "/api/article/img",
    [authJwt.verifyToken],
    uploadController.uploadMatterImg
  );

  app.post(
    "/api/article",
    [authJwt.verifyToken, authJwt.getUsername],
    asyncWrap(controller.createArticle)
  );

  app.post(
    "/api/article/section",
    [authJwt.verifyToken, authJwt.getUsername],
    asyncWrap(controller.createSection)
  );

  app.post(
    "/api/article/section/edit/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    asyncWrap(controller.editSection)
  );

  app.post(
    "/api/article/comment/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    asyncWrap(controller.commentArticle)
  );

  app.post(
    "/api/article/like/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    asyncWrap(controller.likeArticle)
  );

  app.post(
    "/api/article/edit/:id",
    [authJwt.verifyToken],
    asyncWrap(controller.editArticle)
  );

  app.delete(
    "/api/article/:id",
    [authJwt.verifyToken],
    asyncWrap(controller.deleteArticle)
  );

  app.delete(
    "/api/category/:id",
    [authJwt.verifyToken],
    asyncWrap(controller.deleteCategory)
  );
};
