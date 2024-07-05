/* eslint-disable max-len */
const {verifySignUp} = require('../middlewares');
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const controller = require('../controllers/auth.controller');
const uploadController = require('../controllers/fileUpload.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
    );
    next();
  });

  // generateSessionToken
  app.get('/api/auth/generatesession', controller.generateSessionToken);

  // generateStorageToken
  app.post('/api/auth/generatestoragetoken', [authJwt.verifyToken], controller.generateStorageToken);

  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateUsername, verifySignUp.checkDuplicateEmail],
    controller.signup
  );

  app.post("/api/auth/signin", controller.signin);

  app.post('/api/auth/refreshtoken', controller.refreshToken);

  app.post('/api/auth/editprofile', [authJwt.verifyToken, verifySignUp.checkDuplicateUsername, verifySignUp.checkDuplicateEmail], controller.editProfile);

  // getSessions
  app.get('/api/auth/sessions', [authJwt.verifyToken, authJwt.isAdmin], controller.getSessions);

  // editProfileHeadline
  app.post('/api/auth/editprofileheadline', [authJwt.verifyToken], controller.editProfileHeadline);

  // editProfileBio
  app.post('/api/auth/editprofilebio', [authJwt.verifyToken], controller.editProfileBio);

  // changeMedium
  app.post('/api/auth/changemedium', [authJwt.verifyToken], controller.changeMedium);

  // editProfileImage
  app.post('/api/auth/editprofileimage', [authJwt.verifyToken], controller.editProfileImage);

  // changeUsername
  app.post('/api/auth/changeusername', [authJwt.verifyToken, verifySignUp.checkDuplicateUsername], controller.changeUsername);

  // changeEmail
  app.post('/api/auth/changeemail', [authJwt.verifyToken, verifySignUp.checkDuplicateEmail], controller.changeEmail);

  // addWallet
  app.post('/api/auth/wallet/add', [authJwt.verifyToken], controller.addWallet);

  // removeAddress
  app.delete('/api/auth/wallet/remove', [authJwt.verifyToken], controller.removeAddress);

  // editProfileWebsite
  app.post('/api/auth/edit/website', [authJwt.verifyToken], controller.editProfileWebsite);

  app.post('/api/auth/admin/edituser', [authJwt.verifyToken, authJwt.isAdmin], controller.adminEditUser);

  app.post('/api/user/img', [authJwt.verifyToken], uploadController.uploadMatterImg);

  app.get("/api/auth/web3/:address", controller.isWeb3Registered);

  app.post("/api/auth/web3", controller.registerWeb3);

  // get nonce for web3
  app.get("/api/auth/web3/nonce/:address", controller.getNonce);

  // web3 login
  app.post("/api/auth/web3/login", controller.web3Login);

  // get user data
  app.get('/api/auth/user', [authJwt.verifyToken], controller.getUserData);

  app.get('/api/auth/artists', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtists();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  /* ------------------ */
  /* ----- NOT SAFE ----- */
  // registerNewUser
  app.post('/api/auth/createuser', controller.registerNewUser);

  // get nonce for web3
  app.get('/api/auth/web3/nonce/:address', controller.getNonce);

  app.get('/api/auth/verify/:token', controller.verify);

  app.get('/api/auth/recover/:token', controller.recover);

  app.post('/api/auth/verifymail', [authJwt.verifyToken], controller.sendVerificationEmail);

  // sendAuthenticationEmail
  app.post('/api/auth/email', [authJwt.verifySession], controller.sendAuthenticationEmail);

  // verifyAuthenticationEmail
  app.get('/api/auth/email/:token', controller.verifyAuthenticationEmail);

  app.get('/api/auth/verifytoken', [authJwt.verifyToken], controller.validateToken);

  // forgotPassword
  app.post('/api/auth/forgotpassword', [authJwt.verifySession], controller.forgotPassword);

  // definePassword
  app.post('/api/auth/definepassword', [authJwt.verifyToken, authJwt.isAdmin], controller.definePassword);

  // loginWithPassword
  app.post('/api/auth/passwordlogin', [authJwt.verifySession], controller.loginWithPassword);

  // helpVisible
  app.post('/api/auth/helpvisible', [authJwt.verifySession], controller.helpVisible);

  // getSession
  app.get('/api/auth/session', [authJwt.verifySession], controller.getSession);

  // changeUserRole
  app.post('/api/auth/role', [authJwt.verifyToken], controller.changeUserRole);

  // removeUserRole
  app.delete('/api/auth/role/:id', [authJwt.verifyToken], controller.removeUserRole);

  // deleteUserComments
  app.delete('/api/auth/comments/delete', controller.deleteUserComments);

  // delete user
  app.delete('/api/auth/delete', [authJwt.verifyToken], controller.deleteUser);
};
