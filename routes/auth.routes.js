/* eslint-disable max-len */
const {verifySignUp} = require('../middlewares');
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const {monitorSession} = require('../middlewares');
const controller = require('../controllers/auth.controller');
const asyncWrap = require('../middlewares/asyncWrap');
const uploadController = require('../controllers/fileUpload.controller');
const { auth } = require('../models');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'x-refresh-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
        'session-refresh, Origin, Content-Type, Accept'
    );
    next();
  });

  app.use('/api/auth', (req, res, next) => {
    req.target = 'auth';
    next();
  });

  // generateSessionToken
  app.get('/api/auth/generatesession', [monitorSession.extractClientIP], controller.generateSessionToken);

  // generateStorageToken
  app.post('/api/auth/storage/generatestoragetoken', [authJwt.verifyToken], controller.generateStorageToken);

  app.post(
    "/api/auth/signup",
    [ authJwt.verifySession,
      verifySignUp.checkDuplicateUsername, verifySignUp.checkDuplicateEmail],
    asyncWrap(controller.signup)
  );

  app.post("/api/auth/signin", [authJwt.verifySession], asyncWrap(controller.signin));

  app.post('/api/auth/refreshtoken', [authJwt.verifySession], asyncWrap(controller.refreshToken));

  // refreshSession
  app.post('/api/auth/refreshsession', controller.refreshSessionToken);

  app.post('/api/auth/editprofile', [authJwt.verifyToken, verifySignUp.checkDuplicateUsername, verifySignUp.checkDuplicateEmail], asyncWrap(controller.editProfile));

  // getSessions
  app.get('/api/auth/sessions', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(controller.getSessions));

  // editProfileHeadline
  app.post('/api/auth/editprofileheadline', [authJwt.verifyToken], asyncWrap(controller.editProfileHeadline));

  // editProfileBio
  app.post('/api/auth/editprofilebio', [authJwt.verifyToken], asyncWrap(controller.editProfileBio));

  // createTrait
  app.post('/api/auth/traits/create', [authJwt.verifyToken], controller.createTrait);

  // removeTrait
  app.delete('/api/auth/traits/remove', [authJwt.verifyToken], controller.removeTrait);

  // changeMedium
  app.post('/api/auth/changemedium', [authJwt.verifyToken], asyncWrap(controller.changeMedium));

  // deleteusermedium
  app.delete('/api/auth/deletemedium/:name', [authJwt.verifyToken], asyncWrap(controller.deleteUserMedium));

  // editProfileImage
  app.post('/api/auth/editprofileimage', [authJwt.verifyToken], asyncWrap(controller.editProfileImage));

  // changeUsername
  app.post('/api/auth/changeusername', [authJwt.verifyToken, verifySignUp.checkDuplicateUsername], asyncWrap(controller.changeUsername));

  // changeEmail
  app.post('/api/auth/changeemail', [authJwt.verifyToken, verifySignUp.checkDuplicateEmail], asyncWrap(controller.changeEmail));

  // addWallet
  app.post('/api/auth/wallet/add', [authJwt.verifyToken], asyncWrap(controller.addWallet));

  // removeAddress
  app.delete('/api/auth/wallet/remove', [authJwt.verifyToken], asyncWrap(controller.removeAddress));

  // editProfileWebsite
  app.post('/api/auth/edit/website', [authJwt.verifyToken], controller.editProfileWebsite);

  app.post('/api/auth/admin/edituser', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(controller.adminEditUser));
  // admin-grant role
  app.post('/api/auth/admin/grant', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(controller.adminGrantRole));
  // dao grant stub (shared secret)
  app.post('/api/auth/dao/grant', [authJwt.verifySession], asyncWrap(controller.daoGrantRole));

  app.post('/api/user/img', [authJwt.verifyToken], uploadController.uploadMatterImg);

  app.get("/api/auth/web3/:address", asyncWrap(controller.isWeb3Registered));

  app.post("/api/auth/web3", asyncWrap(controller.registerWeb3));

  // get nonce for web3
  app.get("/api/auth/web3/nonce/:address", asyncWrap(controller.getNonce));

  // web3 login
  app.post("/api/auth/web3/login", asyncWrap(controller.web3Login));

  app.get('/api/auth/bitcoin/register/:address', controller.isBitcoinRegistered);

  app.post('/api/auth/bitcoin', controller.registerBitcoin);

   // bitcoin login
   app.post('/api/auth/bitcoin/login', controller.bitcoinLogin);

   // connectBitcoinAddress
    app.post('/api/auth/bitcoin/connect', [authJwt.verifyToken], controller.connectBitcoinAddress);

    // removeBtcAddress
    app.delete('/api/auth/bitcoin/remove', [authJwt.verifyToken], controller.removeBtcAddress);


  // get user data
  app.get('/api/auth/user', [authJwt.verifyToken], asyncWrap(controller.getUserData));

  app.get('/api/auth/artists', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchArtists();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // createCustomer
  app.post('/api/auth/customer/create', [authJwt.verifyToken], controller.createCustomer);

  // loadMyCustomerData
  app.get('/api/auth/customer/data', [authJwt.verifyToken], controller.loadMyCustomerData);

  // deleteCustomer
  app.delete('/api/auth/customer/delete', [authJwt.verifyToken], controller.deleteCustomer);

  /* ------------------ */
  /* ----- Tezos Login ----- */

  // generate challenge
  app.get('/api/auth/tezos/challenge', [authJwt.verifySession], controller.generateChallenge);

  // verify signature
  app.post('/api/auth/tezos/verify', [authJwt.verifySession], controller.verifyTezosSignature);

  /* ------------------ */
  /* ----- NOT SAFE ----- */
  // registerNewUser
  app.post('/api/auth/createuser', controller.registerNewUser);

  // get nonce for web3
  app.get('/api/auth/web3/nonce/:address', controller.getNonce);

  app.get('/api/auth/bitcoin/nonce/:address', controller.getBtcNonce);

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
