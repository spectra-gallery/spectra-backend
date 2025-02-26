/* eslint-disable max-len */
const { authJwt } = require("../middlewares");
const { objectId } = require("../middlewares");
const { verifyPortfolio } = require("../middlewares");
const controller = require("../controllers/portfolio.controller");
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
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, DELETE"
    );
    // x-frame-options sameorigin
    res.header("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // slugToId
  app.get("/api/portfolio/slug/:slug", controller.slugToId);

  // fetchPortfolioName
  app.get("/api/portfolio/name", [authJwt.verifyToken], (req, res) => {
    const elements = controller.fetchPortfolioName(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // create portfolio
  // app.post('/api/portfolio', [authJwt.verifyToken, authJwt.isCreator, verifyPortfolio.checkDuplicateName], controller.createPortfolio);

  app.post(
    "/api/portfolio",
    [authJwt.verifyToken, verifyPortfolio.checkDuplicateName],
    controller.createPortfolio
  );

  // commentPortfolio
  app.post(
    "/api/portfolio/comment/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.commentPortfolio
  );

  // get all series by page
  app.get("/api/portfolio/all/:page", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchPortfolios(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getAllPortfolios
  app.get("/api/portfolio/list", [authJwt.verifySession], (req, res) => {
    const elements = controller.getAllPortfolios(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });
  // fetchAllPortfoliosByNumber
  app.get(
    "/api/portfolio/allnumber/:number",
    [authJwt.verifySession],
    (req, res) => {
      const elements = controller.fetchAllPortfoliosByNumber(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // get portfolio by id
  app.get(
    "/api/portfolioid/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchPortfolioById(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // get portfolio by artist
  app.get(
    "/api/portfolio/artist/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchPortfolioByArtist(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchPortfolioByIdByArtistId
  app.get(
    "/api/portfolio/user/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchPortfolioByIdByArtistId(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchLastPortfolioMedia
  app.get("/api/portfolio/media", (req, res) => {
    const elements = controller.fetchLastPortfolioMedia(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchPortfolioByArtistId
  app.get("/api/portfolio/artistid", [authJwt.verifyToken], (req, res) => {
    const elements = controller.fetchPortfolioByArtistId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // load tag
  app.get("/api/tag/", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchTag();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // numberOfLikedPortfolios

  app.get(
    "/api/portfolio/likednumber/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.numberOfLikedPortfolios(req, res);
      elements.then((elements) => {
        res.status(200).send({
          number: elements,
        });
      });
    }
  );

  // fetchLikedPortfolios
  app.get(
    "/api/portfolio/liked/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchLikedPortfolios(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchLatestPortfolioByArtist
  app.get(
    "/api/portfolio/latest/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchLatestPortfolioByArtist(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchLatestPortfolios
  app.get(
    "/api/portfolio/post/:number",
    [authJwt.verifySession],
    (req, res) => {
      const elements = controller.fetchLatestPortfolios(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // numberOfPortfolios
  app.get("/api/portfolio/totalnumber", [authJwt.verifySession], (req, res) => {
    const elements = controller.numberOfPortfolios(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  app.get("/api/portfolio/scopes/:id", (req, res) => {
    const elements = controller.fetchScopes(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get("/api/portfolio/scope/:id", (req, res) => {
    const element = controller.fetchScope(req, res);
    element.then((elementObj) => {
      res.status(200).send({
        ...elementObj,
      });
    });
  });

  // set views
  app.post(
    "/api/portfolio/views/:id",
    [authJwt.verifySession],
    controller.setViews
  );

  // edit portfolio
  app.post(
    "/api/portfolio/edit/:id",
    [
      authJwt.verifyToken,
      objectId.isValidObjectId,
      verifyPortfolio.checkDuplicateNameEdit,
    ],
    controller.editPortfolio
  );

  // editUserPortfolio
  app.post(
    "/api/portfolio/user/edit/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.editUserPortfolio
  );

  // set portfolio on display
  app.post(
    "/api/portfolio/display/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.setPortfolioOnDisplay
  );

  // update portfolio tag
  app.post(
    "/api/portfolio/tag/update/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.updatePortfolioTag
  );

  // editPortfolioName
  app.post(
    "/api/portfolio/name/:id",
    [
      authJwt.verifyToken,
      objectId.isValidObjectId,
      verifyPortfolio.checkDuplicateNameEdit,
    ],
    controller.editPortfolioName
  );

  // editPortfolioSubtitle
  app.post(
    "/api/portfolio/subtitle/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.editPortfolioSubtitle
  );

  // editPortfolioDescription
  app.post(
    "/api/portfolio/description/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.editPortfolioDescription
  );

  app.post(
    "/api/portfolio/like/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.likePortfolio
  );

  // createTag
  app.post(
    "/api/portfolio/tag",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.createTag
  );

  // toggleReviewPortfolio
  app.post(
    "/api/portfolio/review/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.toggleReviewPortfolio
  );

  app.post(
    "/api/portfolio/scope",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.createScope
  );

  app.post(
    "/api/portfolio/scope/edit/:id",
    [authJwt.verifyToken, authJwt.getUsername],
    controller.editScope
  );

  //  editSectionTitle
  app.post(
    "/api/portfolio/scope/title/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.editScopeTitle
  );

  // editSectionContent
  app.post(
    "/api/portfolio/scope/content/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.editScopeContent
  );

  // editSectionImageUrl
  app.post(
    "/api/portfolio/scope/image/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.editScopeImageUrl
  );

  // remeoveWhitelistAddress
  // app.post('/api/portfolio/whitelist/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeWhitelistAddress);

  // set featured series
  // app.post('/api/portfolio/featured', [authJwt.verifyToken, authJwt.isAdmin], controller.setFeaturedPortfolios);

  // delete portfolio
  app.delete(
    "/api/portfolio/user/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.deletePortfolio
  );

  // adminDeletePortfolio
  app.delete(
    "/api/portfolio/admin/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.adminDeletePortfolio
  );

  // deleteTag
  app.delete(
    "/api/portfolio/tag/:id",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.deleteTag
  );

  // remove tag
  app.post(
    "/api/portfolio/tag/remove/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.removePortfolioTag
  );

  // remove comment
  app.delete(
    "/api/portfolio/comment/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.removeComment
  );

  // removePortfolioTrait
  // app.delete('/api/exhibition/portfolio/trait/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removePortfolioTrait);

  // deletePortfolioInscriptions
  // app.delete('/api/portfolio/deleteinscriptions', controller.deletePortfolioInscriptions);
};
