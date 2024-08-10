/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const controller = require('../controllers/wallet.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
    );
    next();
  });

  // setKey
  app.post('/api/wallet/setkey', [authJwt.verifyToken, authJwt.isAdmin], controller.setKey);

  // rotateKey
  app.post('/api/wallet/rotate', [authJwt.verifyToken, authJwt.isAdmin], controller.rotateKey);

  // isValidAddress
  app.get('/api/wallet/valid/:address', [authJwt.verifySession], controller.isValidAddress);

  // getExchangeRate
  app.get('/api/wallet/exchange', [authJwt.verifySession], controller.getExchangeRate);

  // sendTransaction
  // app.post('/api/wallet/send', [authJwt.isSudoer], controller.sendTransaction);

  // checkUTXOS
  app.get('/api/wallet/check', controller.checkUTXOS);

  // logWallet
  app.post('/api/wallet/log', [authJwt.verifyToken, authJwt.isAdmin], controller.logWallet);

  // generateWallet
  app.post('/api/wallet/generate', [authJwt.verifyToken, authJwt.isAdmin], controller.generateWallet);

  // deleteWallet
  app.post('/api/wallet/delete', [authJwt.verifyToken, authJwt.isAdmin], controller.deleteWallet);

  // assignWalletById
  app.post('/api/wallet/assignid/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.assignWalletById);

  // getAddressVolume
  app.get('/api/wallet/volume/:address', [authJwt.verifySession], controller.getAddressVolume);

  // logAddressVolume
  app.post('/api/wallet/logvolume', [authJwt.verifySession], controller.logAddressVolume);

  // scheduleTask
  app.post('/api/wallet/schedule', controller.scheduleTask);

  // getCurrentWallet
  app.get('/api/wallet/currentwallet', [authJwt.verifySession], controller.getCurrentWallet);

  // assignWalletId
  app.post('/api/wallet/assign', [authJwt.verifyToken, authJwt.isAdmin], controller.assignWalletId);

  // getPayments
  app.get('/api/wallet/payments', [authJwt.verifyToken, authJwt.isAdmin], controller.getPayments);

  // getBalance
  app.get('/api/wallet/balance/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.getBalance);

  // getTransactionsByAddress
  app.get('/api/wallet/addresstransactions/:address', [authJwt.verifyToken, authJwt.isAdmin], controller.getTransactionsByAddress);

  // getTransactions
  app.get('/api/wallet/transactions', [authJwt.verifyToken, authJwt.isAdmin], controller.getTransactions);

  // getWallets
  app.get('/api/wallet/wallets', [authJwt.verifyToken, authJwt.isAdmin], controller.getWallets);

  // transactionDetected
  app.get('/api/wallet/txdetected/:id', [authJwt.verifySession], controller.transactionDetected);

  // creatPsbt
  app.post('/api/wallet/psbt', [authJwt.verifyToken], controller.createPsbt);

  // broadcastPsbt
  app.post('/api/wallet/broadcast', [authJwt.verifyToken], controller.broadcastPsbt);

  // generateWallet
  app.post('/api/wallet/generate', [authJwt.verifyToken], controller.generateWallet);

  // createPrintPaymentIntent
  app.post('/api/wallet/print/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.createPrintPaymentIntent);
};
