const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');
const chain = require('../services/chain.service');

async function userRoleNames(user) {
  const roles = await db.role.find({ _id: { $in: user.role } }).lean();
  return new Set(roles.map(r => String(r.name).toLowerCase()));
}

async function ensureRoleDoc(name) {
  let r = await db.role.findOne({ name }).lean();
  if (!r) { r = await db.role.create({ name }); }
  return r._id || r.id;
}

module.exports = function(app) {
  // Compute drift for a sample of users (admin)
  app.get('/api/chain/role-drift', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const lim = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const users = await db.user.find({}).select('_id username email role address cardinalAddress ordinalAddress whitelisted creator verified').limit(lim).lean();
    const items = [];
    for (const u of users) {
      const addr = u.address || u.cardinalAddress || u.ordinalAddress;
      if (!addr) continue;
      const on = await chain.roleState(addr);
      if (!on.ok) continue;
      const dbRoles = await userRoleNames(u);
      const onRoles = new Set(['admin','creator','thinker','myself'].filter(r => on.state[r]));
      const missingInChain = [...dbRoles].filter(r => ['admin','creator','thinker','myself'].includes(r) && !onRoles.has(r));
      const missingInDb = [...onRoles].filter(r => !dbRoles.has(r));
      if (missingInChain.length || missingInDb.length) {
        items.push({ userId: u._id, username: u.username, address: addr, missingInChain, missingInDb });
      }
    }
    res.json({ ok: true, items });
  }));

  // Sync DB roles to match on-chain (admin) for a list of addresses or userIds
  app.post('/api/chain/role-sync', [authJwt.verifyToken, authJwt.isAdmin], asyncWrap(async (req, res) => {
    const { users = [], addresses = [] } = req.body || {};
    const ids = new Set(users.map(String)); const addrs = new Set(addresses.map(String));
    const q = ids.size ? { _id: { $in: [...ids] } } : addrs.size ? { $or: [{ address: { $in: [...addrs] } }, { cardinalAddress: { $in: [...addrs] } }, { ordinalAddress: { $in: [...addrs] } }] } : {};
    const list = await db.user.find(q).select('_id role address cardinalAddress ordinalAddress').lean();
    const roleIds = {
      admin: await ensureRoleDoc('admin'),
      creator: await ensureRoleDoc('creator'),
      thinker: await ensureRoleDoc('thinker'),
      myself: await ensureRoleDoc('myself'),
    };
    let updated = 0;
    for (const u of list) {
      const addr = u.address || u.cardinalAddress || u.ordinalAddress;
      if (!addr) continue;
      const on = await chain.roleState(addr);
      if (!on.ok) continue;
      const current = new Set((u.role || []).map(String));
      const desired = new Set(['admin','creator','thinker','myself'].filter(r => on.state[r]).map(r => String(roleIds[r])));
      const next = new Set([...current, ...desired]);
      if (next.size !== current.size) {
        await db.user.updateOne({ _id: u._id }, { $set: { role: [...next] } });
        updated++;
      }
    }
    res.json({ ok: true, updated });
  }));
};

