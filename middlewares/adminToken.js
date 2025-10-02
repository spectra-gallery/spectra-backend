require('dotenv').config();
const appCypherConfig = require('../config/app.cypher.config');

function adminToken(req, res, next) {
  const token = req.headers['x-admin-token'] || req.headers['spectra-admin-token'];
  const expected = process.env.ADMIN_RESTART_TOKEN || appCypherConfig.ADMIN_RESTART_TOKEN;
  if (!expected) {
    return res.status(503).json({ ok: false, error: 'ADMIN token not configured' });
  }
  if (!token || token !== expected) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
}

module.exports = adminToken;

