const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function(app) {
  // Persist client-submitted tx hash (wallet-sent)
  app.post('/api/onchain/tx', [authJwt.verifySession], asyncWrap(async (req, res) => {
    const { type, roleName, requestId, address, valueEth, txHash, meta } = req.body || {};
    if (!txHash) return res.status(400).json({ ok: false, error: 'txHash_required' });
    const doc = await db.onchainTx.create({ type: type || 'wallet', roleName, requestId, address, valueEth, txHash, meta });
    res.json({ ok: true, id: doc._id, txHash: doc.txHash });
  }));
};

