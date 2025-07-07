/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const controller = require('../controllers/swap.controller');

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

  // checkInscriptionStatus
  app.get('/api/swap/transaction/status/:id', [authJwt.verifySession], controller.checkTransactionStatus);

  // hasDummyUtxos
  app.get('/api/swap/utxos/:address', [authJwt.verifySession], controller.hasDummyUtxos);

  // getBidsByTokenId
  app.get('/api/swap/bidding/tokenid/:id', [authJwt.verifySession], (req, res) => {
    const elements = controller.getBidsByTokenId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getTransactionsByTokenId
  app.get('/api/swap/transactions/tokenid/:id', [authJwt.verifySession], (req, res) => {
    const elements = controller.getTransactionsByTokenId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getHighestBidAmountByTokenId
  app.get('/api/swap/bidding/highestbid/:id', [authJwt.verifySession], (req, res) => {
    const elements = controller.getHighestBidAmountByTokenId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getSwapTransactionsByUsers
  app.get('/api/swap/transactions/users', [authJwt.verifyToken], (req, res) => {
    const elements = controller.getSwapTransactionsByUsers(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getInscribingTransactionsByUsers
  /*
  app.get('/api/swap/inscribing/users', [authJwt.verifyToken], (req, res) => {
    const elements = controller.getInscribingTransactionsByUsers(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });
  */

  // getFees
  app.get('/api/swap/btc/fees', [authJwt.verifySession], controller.getFees);

  // getFeesRate
  app.get('/api/swap/btc/fees/rate', [authJwt.verifySession], controller.getFeesRate);

  // sendUTXOS
  app.post('/api/swap/utxos/send/:address', [authJwt.verifyToken], controller.sendUTXOS);

  // hasPendingTransactions
  app.get('/api/swap/transactions/pending', [authJwt.verifyToken], controller.hasPendingTransactions);

  // hasInscribingTransactions
  app.get('/api/swap/inscribing/pending', [authJwt.verifyToken], controller.hasInscribingTransactions);

  // createOrdinalListingPsbt
  app.post('/api/swap/listing/create', [authJwt.verifyToken], controller.createOrdinalListingPsbt);

  // verifyOrdinalListingPsbt
  app.post('/api/swap/listing/verify', [authJwt.verifyToken], controller.verifyOrdinalListingPsbt);

  // createNewBuyTransaction
  app.post('/api/swap/buy/create', [authJwt.verifyToken], controller.createNewBuyTransaction);

  // verifyBuyTransaction
  app.post('/api/swap/buy/verify', [authJwt.verifyToken], controller.verifyBuyTransaction);

  // generateUnsignedDummyUtxoPsbt
  app.post('/api/swap/utxo/create', [authJwt.verifyToken], controller.generateUnsignedDummyUtxoPsbt);

  // verifyDummyUtxoPsbt
  app.post('/api/swap/utxo/verify', [authJwt.verifyToken], controller.verifyDummyUtxoPsbt);

  // cancelOrdinalListing
  app.post('/api/swap/listing/cancel/:id', [authJwt.verifyToken], controller.cancelOrdinalListing);

  // cancelOrdinalBuying
  app.post('/api/swap/buy/cancel/:id', [authJwt.verifyToken], controller.cancelOrdinalBuying);

  // createOrdinalBiddingPsbt
  app.post('/api/swap/bidding/create', [authJwt.verifyToken], controller.createOrdinalBiddingPsbt);

  // verifyOrdinalBiddingPsbt
  app.post('/api/swap/bidding/verify', [authJwt.verifyToken], controller.verifyOrdinalBiddingPsbt);

  // cancelOrdinalBidding
  app.post('/api/swap/bidding/cancel/:id', [authJwt.verifyToken], controller.cancelOrdinalBidding);

  // acceptBid
  app.post('/api/swap/bidding/accept', [authJwt.verifyToken], controller.acceptBid);

  // finalizeBiddingTransaction
  app.post('/api/swap/bidding/finalize', [authJwt.verifyToken], controller.finalizeBiddingTransaction);
};
