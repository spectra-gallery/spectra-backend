/* eslint-disable max-len */
// const {verifySignUp} = require('../middlewares');
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const controller = require('../controllers/user.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
    );
    next();
  });

  // usernameToId
  app.get('/api/user/id/:username', [authJwt.verifySession], controller.usernameToId);

  // fetchUsers
  app.get('/api/user/all', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchUsers(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchLastLoggedInUsers
  app.get('/api/user/lastloggedin', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchLastLoggedInUsers(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get('/api/user/artists', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtists(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get artist by id
  app.get('/api/user/artist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchArtistById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchUserById
  app.get('/api/user/user/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchUserById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetch featured artists
  app.get('/api/user/featured', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchFeaturedArtists(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get('/api/user/sections/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchSections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchSection
  app.get('/api/user/section/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchSection(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchArtistByCollection
  app.get('/api/user/collection/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchArtistByCollection(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchHighestVolumeArtists
  app.get('/api/user/highestvolume', [authJwt.verifySession], controller.fetchHighestVolumeArtists);

  // fetchArtistByOrdinalAddress
  app.get('/api/user/ordinal/:address', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtistByOrdinalAddress(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // addressToUsername
  app.get('/api/user/username/:address', [authJwt.verifySession], (req, res) => {
    const elements = controller.addressToUsername(req, res);
    elements.then((elements) => {
      res.status(200).send({
        elements,
      });
    });
  });

  // fetchLikedUsers
  app.get('/api/user/liked/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLikedUsers(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get user roles
  app.get('/api/user/roles', [authJwt.verifySession], controller.getUserRoles);

  // set featured artists
  app.post('/api/user/featured', [authJwt.verifyToken, authJwt.isAdmin], controller.setFeaturedArtists);

  // get creator applications
  app.get('/api/user/apply', [authJwt.verifyToken, authJwt.isAdmin], controller.getCreatorApplications);

  // likeUser
  app.post('/api/user/like/:id', [authJwt.verifyToken], controller.likeUser);

  app.post('/api/user/comment/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.commentCreator);

  // creator apply
  app.post('/api/user/apply', [authJwt.verifyToken], controller.creatorApply);

  // grant application
  app.post('/api/user/apply/grant/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.grantApplication);

  // change user role
  app.post('/api/user/role/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.changeUserRole);

  app.post('/api/user/whitelistreq', [authJwt.verifyToken], controller.whitelistAddressReq);

  app.post('/api/user/whitelist', [authJwt.verifyToken, authJwt.isAdmin], controller.whitelistAddress);

  // whitelistUserById
  app.post('/api/user/whitelistid/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.whitelistUserById);

  app.delete('/api/user/comment/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.deleteComment);

  app.delete('/api/user/delete/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.deleteUserById);

  // generateSlug
  // app.post('/api/user/slug', controller.generateSlug);
};
