/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const controller = require('../controllers/swap.controller');
const asyncWrap = require('../middlewares/asyncWrap');

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
  app.get('/api/swap/transaction/status/:id', [authJwt.verifySession], asyncWrap(controller.checkTransactionStatus));

  // hasDummyUtxos
  app.get('/api/swap/utxos/:address', [authJwt.verifySession], asyncWrap(controller.hasDummyUtxos));

  // getBidsByTokenId
  app.get('/api/swap/bidding/tokenid/:id', [authJwt.verifySession], asyncWrap(async (req, res) => {
    const data = await controller.getBidsByTokenId(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // getTransactionsByTokenId
  app.get('/api/swap/transactions/tokenid/:id', [authJwt.verifySession], asyncWrap(async (req, res) => {
    const data = await controller.getTransactionsByTokenId(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // getHighestBidAmountByTokenId
  app.get('/api/swap/bidding/highestbid/:id', [authJwt.verifySession], asyncWrap(async (req, res) => {
    const data = await controller.getHighestBidAmountByTokenId(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

  // getSwapTransactionsByUsers
  app.get('/api/swap/transactions/users', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const data = await controller.getSwapTransactionsByUsers(req, res);
    res.status(200).send({ ok: true, data, reqId: req.context && req.context.id });
  }));

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
  app.get('/api/swap/btc/fees', [authJwt.verifySession], asyncWrap(controller.getFees));

  // getFeesRate
  app.get('/api/swap/btc/fees/rate', [authJwt.verifySession], asyncWrap(controller.getFeesRate));

  // sendUTXOS
  app.post('/api/swap/utxos/send/:address', [authJwt.verifyToken], asyncWrap(controller.sendUTXOS));

  // hasPendingTransactions
  app.get('/api/swap/transactions/pending', [authJwt.verifyToken], asyncWrap(controller.hasPendingTransactions));

  // hasInscribingTransactions
  app.get('/api/swap/inscribing/pending', [authJwt.verifyToken], asyncWrap(controller.hasInscribingTransactions));

  // createOrdinalListingPsbt
  app.post('/api/swap/listing/create', [authJwt.verifyToken], asyncWrap(controller.createOrdinalListingPsbt));

  // verifyOrdinalListingPsbt
  app.post('/api/swap/listing/verify', [authJwt.verifyToken], asyncWrap(controller.verifyOrdinalListingPsbt));

  // createNewBuyTransaction
  app.post('/api/swap/buy/create', [authJwt.verifyToken], asyncWrap(controller.createNewBuyTransaction));

  // verifyBuyTransaction
  app.post('/api/swap/buy/verify', [authJwt.verifyToken], asyncWrap(controller.verifyBuyTransaction));

  // generateUnsignedDummyUtxoPsbt
  app.post('/api/swap/utxo/create', [authJwt.verifyToken], asyncWrap(controller.generateUnsignedDummyUtxoPsbt));

  // verifyDummyUtxoPsbt
  app.post('/api/swap/utxo/verify', [authJwt.verifyToken], asyncWrap(controller.verifyDummyUtxoPsbt));

  // cancelOrdinalListing
  app.post('/api/swap/listing/cancel/:id', [authJwt.verifyToken], asyncWrap(controller.cancelOrdinalListing));

  // cancelOrdinalBuying
  app.post('/api/swap/buy/cancel/:id', [authJwt.verifyToken], asyncWrap(controller.cancelOrdinalBuying));

  // createOrdinalBiddingPsbt
  app.post('/api/swap/bidding/create', [authJwt.verifyToken], asyncWrap(controller.createOrdinalBiddingPsbt));

  // verifyOrdinalBiddingPsbt
  app.post('/api/swap/bidding/verify', [authJwt.verifyToken], asyncWrap(controller.verifyOrdinalBiddingPsbt));

  // cancelOrdinalBidding
  app.post('/api/swap/bidding/cancel/:id', [authJwt.verifyToken], asyncWrap(controller.cancelOrdinalBidding));

  // acceptBid
  app.post('/api/swap/bidding/accept', [authJwt.verifyToken], asyncWrap(controller.acceptBid));

  // finalizeBiddingTransaction
  app.post('/api/swap/bidding/finalize', [authJwt.verifyToken], asyncWrap(controller.finalizeBiddingTransaction));
};
