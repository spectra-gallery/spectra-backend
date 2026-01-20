const asyncWrap = require('../middlewares/asyncWrap');
const { authJwt } = require('../middlewares');
const chain = require('../services/chain.service');
const dao = require('../services/dao.service');

module.exports = function(app) {
  app.get('/api/chain/status', asyncWrap(async (req, res) => {
    res.json({
      ok: true,
      accessControl: chain.isConfigured(),
      dao: dao.isConfigured(),
      addresses: {
        accessControl: process.env.ACCESS_CONTROL_ADDRESS || null,
        dao: dao.address && dao.address() || process.env.DAO_CONTRACT_ADDRESS || null,
      },
      provider: Boolean(process.env.ETH_API_URL),
    });
  }));

  app.get('/api/chain/role-state', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const address = (req.query && req.query.address) || '';
    if (!address) return res.status(400).json({ ok: false, error: 'address_required' });
    const out = await chain.roleState(address);
    res.status(out.ok ? 200 : 503).json(out);
  }));
};

