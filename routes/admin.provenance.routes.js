const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function(app) {
  // List provenance entries with optional filters
  app.get('/api/admin/provenance', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { tags, actor, action, limit = 50 } = req.query || {};
    const q = {};
    if (tags) q.tags = { $in: String(tags).split(',').map(s => s.trim()).filter(Boolean) };
    if (actor) q.actor = actor;
    if (action) q.action = action;
    const items = await db.provenance.find(q).sort({ _id: -1 }).limit(Math.min(parseInt(limit, 10) || 50, 500)).lean();
    res.json({ ok: true, items });
  }));
};

