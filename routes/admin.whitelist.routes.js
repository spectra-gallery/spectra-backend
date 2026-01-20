const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function(app) {
  const Whitelist = db.whitelist;

  // List whitelist entries (filters: used, paid)
  app.get('/api/admin/whitelist', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const q = {};
    if (typeof req.query.used !== 'undefined') q.used = req.query.used === 'true';
    if (typeof req.query.paid !== 'undefined') q.paid = req.query.paid === 'true';
    const items = await Whitelist.find(q).sort({ _id: -1 }).lean();
    res.json({ ok: true, items });
  }));

  // Create single or bulk whitelist entries
  app.post('/api/admin/whitelist', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { entries, address, value, spots, chain } = req.body || {};
    let created = [];
    if (Array.isArray(entries) && entries.length) {
      created = await Whitelist.insertMany(entries.map(e => ({
        address: e.address,
        value: e.value,
        used: !!e.used,
        paid: !!e.paid,
        spots: e.spots,
        chain: e.chain,
      })));
    } else if (address && typeof value !== 'undefined') {
      const doc = await Whitelist.create({ address, value, spots, chain });
      created = [doc];
    } else {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }
    res.json({ ok: true, count: created.length, items: created });
  }));

  // Update entry flags
  app.post('/api/admin/whitelist/:id/mark', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { id } = req.params;
    const { used, paid } = req.body || {};
    const doc = await Whitelist.findById(id);
    if (!doc) return res.status(404).json({ ok: false, error: 'not_found' });
    if (typeof used !== 'undefined') doc.used = !!used;
    if (typeof paid !== 'undefined') doc.paid = !!paid;
    await doc.save();
    res.json({ ok: true, item: doc });
  }));

  // Delete entry
  app.delete('/api/admin/whitelist/:id', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { id } = req.params;
    await Whitelist.deleteOne({ _id: id });
    res.json({ ok: true, id });
  }));
};

