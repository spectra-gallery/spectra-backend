const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const dao = require('../services/dao.service');

module.exports = function(app) {
  // Admin approve membership (send or build tx)
  app.post('/api/dao/admin/approve/membership', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { requestId, send } = req.body || {};
    if (typeof requestId === 'undefined') return res.status(400).json({ ok: false, error: 'requestId_required' });
    if (send) {
      const out = await dao.sendTx('approveMembershipRequest', [requestId]);
      try { if (out && out.ok && out.txHash) { const db = require('../models'); await db.onchainTx.create({ type: 'membership_approve', requestId, txHash: out.txHash }); } } catch (_) {}
      return res.status(out.ok ? 200 : 503).json(out);
    }
    const tx = await dao.buildTx('approveMembershipRequest', [requestId]);
    return res.status(tx.ok ? 200 : 503).json(tx);
  }));

  // Admin approve project (send or build tx)
  app.post('/api/dao/admin/approve/project', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { requestId, send } = req.body || {};
    if (typeof requestId === 'undefined') return res.status(400).json({ ok: false, error: 'requestId_required' });
    if (send) {
      const out = await dao.sendTx('approveProjectRequest', [requestId]);
      try { if (out && out.ok && out.txHash) { const db = require('../models'); await db.onchainTx.create({ type: 'project_approve', requestId, txHash: out.txHash }); } } catch (_) {}
      return res.status(out.ok ? 200 : 503).json(out);
    }
    const tx = await dao.buildTx('approveProjectRequest', [requestId]);
    return res.status(tx.ok ? 200 : 503).json(tx);
  }));

  app.post('/api/dao/admin/revoke/project', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { requestId, send } = req.body || {};
    if (typeof requestId === 'undefined') return res.status(400).json({ ok: false, error: 'requestId_required' });
    if (send) {
      const out = await dao.sendTx('revokeProjectRequest', [requestId]);
      try { if (out && out.ok && out.txHash) { const db = require('../models'); await db.onchainTx.create({ type: 'project_revoke', requestId, txHash: out.txHash }); } } catch (_) {}
      return res.status(out.ok ? 200 : 503).json(out);
    }
    const tx = await dao.buildTx('revokeProjectRequest', [requestId]);
    return res.status(tx.ok ? 200 : 503).json(tx);
  }));
};
