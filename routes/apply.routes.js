const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function(app) {
  const Apply = db.apply;

  // Submit an application for a role (admin/creator/thinker/reviewer/e-libre/myself)
  app.post('/api/apply', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const { type, about, links } = req.body || {};
    if (!type || !about) return res.status(400).json({ ok: false, error: 'type and about are required' });
    const appDoc = await Apply.create({ type, about, links: Array.isArray(links) ? links : [], user: req.userId });
    res.json({ ok: true, id: appDoc._id, status: appDoc.status });
  }));

  // My applications
  app.get('/api/apply/mine', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const mine = await Apply.find({ user: req.userId }).sort({ date: -1 }).lean();
    res.json({ ok: true, items: mine });
  }));
};

