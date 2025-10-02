/* eslint-disable max-len */
// const {verifySignUp} = require('../middlewares');
const { authJwt, verifySignUp, verifyProperty } = require("../middlewares");
const { objectId } = require("../middlewares");
const { event } = require("../middlewares");
const controller = require("../controllers/user.controller");
const asyncWrap = require("../middlewares/asyncWrap");

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

  // usernameToId
  app.get(
    "/api/user/id/:username",
    [authJwt.verifySession],
    asyncWrap(controller.usernameToId)
  );

  // setViews
  app.post(
    "/api/user/views/:id",
    [authJwt.verifySession, objectId.isValidObjectId, event.debounceView],
    asyncWrap(controller.setViews)
  );

  app.get("/api/user/sortnumber/:role", [authJwt.verifySession], asyncWrap(async (req, res) => {
    const number = await controller.numberOfUsersSort(req, res);
    res.status(200).send({ number });
  }));

  // fetchUsers
  app.get("/api/user/all", [authJwt.verifySession], asyncWrap(async (req, res) => {
    const elements = await controller.fetchUsers(req, res);
    res.status(200).send({ ...elements });
  }));

  // fetchArtistsByRoleSort
  app.get("/api/user/sort/:number", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtistsByRoleSort(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchLastLoggedInUsers
  app.get("/api/user/lastloggedin", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchLastLoggedInUsers(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get("/api/user/artists", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtists(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get artist by id
  app.get(
    "/api/user/artist/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchArtistById(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchUserById
  app.get(
    "/api/user/userid/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchUserById(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetch featured artists
  app.get("/api/user/featured", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchFeaturedArtists(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get(
    "/api/user/sections/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchSections(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchSection
  app.get(
    "/api/user/section/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchSection(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchArtistByCollection
  app.get(
    "/api/user/serie/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchArtistBySerie(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchArtistByPost
  app.get(
    "/api/user/post/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchArtistByPost(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchArtistByPost
  app.get(
    "/api/user/podcast/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchArtistByPodcast(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchArtistByPortfolio
  app.get(
    "/api/user/portfolio/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchArtistByPortfolio(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchHighestVolumeArtists
  app.get(
    "/api/user/highestvolume",
    [authJwt.verifySession],
    controller.fetchHighestVolumeArtists
  );

  // fetchArtistByOrdinalAddress
  app.get("/api/user/ordinal/:address", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtistByOrdinalAddress(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // addressToUser
  app.get("/api/user/address/:address", [authJwt.verifySession], (req, res) => {
    const elements = controller.addressToUser(req, res);
    elements.then((elements) => {
      res.status(200).send({
        elements,
      });
    });
  });

  // addressToUsername
  app.get(
    "/api/user/username/:address",
    [authJwt.verifySession],
    (req, res) => {
      const elements = controller.addressToUsername(req, res);
      elements.then((elements) => {
        res.status(200).send({
          elements,
        });
      });
    }
  );

  // fetchLikedUsers
  app.get(
    "/api/user/liked/:id",
    [authJwt.verifySession, objectId.isValidObjectId],
    (req, res) => {
      const elements = controller.fetchLikedUsers(req, res);
      elements.then((elements) => {
        res.status(200).send({
          ...elements,
        });
      });
    }
  );

  // fetchUserSelect
  app.get("/api/user/select", [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchUserSelect(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });
  /*
  app.use('/api/user', (req, res, next) => {
    req.target = 'user';
    next();
  });
  */

  app.use('/api/user/:key', (req, res, next) => {
    const key = req.params.key;
    req.target = 'user';
    req.property = key;
    next();
  });

  /*
  app.use('/api/user/:medium', (req, res, next) => {
    const params = req.params.medium;
    req.target = 'user';
    req.property = 'medium';
    next();
  });
  */

  // get user roles
  app.get("/api/user/roles", [authJwt.verifySession], controller.getRoles);

  // getMediums
  app.get("/api/user/mediums", [authJwt.verifySession], controller.getMediums);

  // createMedium
  app.post(
    "/api/user/medium",
    [authJwt.verifyToken, authJwt.isAdmin, verifyProperty.propertyExists],
    controller.createMedium
  );

  // deleteMedium
  app.delete(
    "/api/user/medium/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId, verifyProperty.checkPropertyRef],
    controller.deleteMedium
  );

  // set featured artists
  app.post(
    "/api/user/featured",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.setFeaturedArtists
  );

  // get creator applications
  app.get(
    "/api/user/apply",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getCreatorApplications
  );

  // likeUser
  app.post("/api/user/like/:id", [authJwt.verifyToken], controller.likeUser);

  app.post(
    "/api/user/comment/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.commentCreator
  );

  // getApplyId
  app.get(
    "/api/user/applyid/:address",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getApplyId
  );

  // creator apply
  app.post("/api/user/apply", [authJwt.verifyToken], controller.creatorApply);

  // grant application
  app.post(
    "/api/user/apply/grant/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.grantApplication
  );

  // denyApplication
  app.post(
    "/api/user/apply/deny/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.denyApplication
  );

  // getApplications
  app.get(
    "/api/user/applications",
    [authJwt.verifyToken],
    controller.getApplications
  );

  // change user role
  app.post(
    "/api/user/role/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.changeUserRole
  );

  // changeAddress
  app.post(
    "/api/user/address/:id",
    [
      authJwt.verifyToken,
      authJwt.isAdmin,
      objectId.isValidObjectId,
      verifySignUp.checkDuplicateAddress,
    ],
    controller.changeAddress
  );

  app.post(
    "/api/user/whitelistreq",
    [authJwt.verifyToken],
    controller.whitelistAddressReq
  );

  app.post(
    "/api/user/whitelist",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.whitelistAddress
  );

  // whitelistUserById
  app.post(
    "/api/user/whitelistid/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.whitelistUserById
  );

  // remove apply
  app.delete(
    "/api/user/apply/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.removeApply
  );

  // adminRemoveApplication
  app.delete(
    "/api/user/removeapply/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.adminRemoveApplication
  );

  app.delete(
    "/api/user/comment/:id",
    [authJwt.verifyToken, objectId.isValidObjectId],
    controller.deleteComment
  );

  app.delete(
    "/api/user/delete/:id",
    [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId],
    controller.deleteUserById
  );

  // generateSlug
  // app.post('/api/user/slug', controller.generateSlug);
};
