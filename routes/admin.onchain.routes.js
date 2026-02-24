const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function(app) {
  // List on-chain tx logs
  app.get('/api/admin/onchain/tx', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const q = {};
    if (req.query.type) q.type = req.query.type;
    const items = await db.onchainTx.find(q).sort({ _id: -1 }).limit(200).lean();
    res.json({ ok: true, items });
  }));
};

