const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function(app) {
  const Apply = db.apply;
  const User = db.user;

  // List applications, default pending
  app.get('/api/admin/apply', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const status = (req.query.status || 'pending').toLowerCase();
    const items = await Apply.find({ status }).populate('user', 'username email whitelisted').sort({ date: -1 }).lean();
    res.json({ ok: true, items });
  }));

  // Approve an application: mark granted/status and optionally mark user whitelisted/role hints
  app.post('/api/admin/apply/:id/approve', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { id } = req.params;
    const doc = await Apply.findById(id);
    if (!doc) return res.status(404).json({ ok: false, error: 'not_found' });
    doc.granted = true;
    doc.status = 'approved';
    doc.grantedBy = req.userId;
    await doc.save();
    // Optional: mark user flags
    if (doc.user) {
      const u = await User.findById(doc.user);
      if (u) {
        if (doc.type === 'creator' || doc.type === 'myself') u.creator = true;
        if (doc.type === 'thinker' || doc.type === 'reviewer') u.verified = true;
        // Auto-whitelist on approval
        u.whitelisted = true;
        // Auto-grant admin role if application type is 'admin'
        if (doc.type === 'admin') {
          const Role = db.role;
          let adminRole = await Role.findOne({ name: 'admin' });
          if (!adminRole) adminRole = await Role.create({ name: 'admin' });
          const has = (u.role || []).some(r => String(r) === String(adminRole._id));
          if (!has) u.role.push(adminRole._id);
        }
        await u.save();
        // Best-effort on-chain role grant when configured
        try {
          const chain = require('../services/chain.service');
          const db = require('../models');
          const roleName = (doc.type === 'admin' || doc.type === 'creator' || doc.type === 'thinker' || doc.type === 'myself') ? doc.type : null;
          const address = u.address || u.cardinalAddress || u.ordinalAddress;
          if (chain.isConfigured() && roleName && address) {
            const onchain = await chain.grantRoleOnChain(address, roleName);
            if (onchain && onchain.ok && onchain.txHash) {
              try { await db.onchainTx.create({ type: 'role_grant', roleName, address, txHash: onchain.txHash, meta: { approveApplyId: String(id) } }); } catch (_) {}
            } else if (onchain && !onchain.ok) {
              console.warn('on-chain grant failed:', onchain.error);
            }
          }
        } catch (e) {
          console.warn('on-chain grant error:', e && e.message ? e.message : e);
        }
      }
    }
    res.json({ ok: true, id, status: 'approved' });
  }));

  // Reject application
  app.post('/api/admin/apply/:id/reject', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { id } = req.params;
    const doc = await Apply.findById(id);
    if (!doc) return res.status(404).json({ ok: false, error: 'not_found' });
    doc.granted = false;
    doc.status = 'rejected';
    doc.grantedBy = req.userId;
    await doc.save();
    res.json({ ok: true, id, status: 'rejected' });
  }));
};
