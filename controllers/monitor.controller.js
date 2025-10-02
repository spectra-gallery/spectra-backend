const axios = require('axios');
const appCypherConfig = require('../config/app.cypher.config');
const db = require('../models');
const { storageStatus } = require('../services/storageSetup');

async function ping(url) {
  try {
    const res = await axios.get(url, { timeout: 4000 });
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function monitor(req, res) {
  try {
    const mongoose = db.mongoose;
    const dbState = mongoose.connection && mongoose.connection.readyState;
    const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    // Backend self
    const backend = {
      ok: dbState === 1,
      port: appCypherConfig.PORT || 8000,
      db: { state: dbStates[dbState] || 'unknown', code: dbState },
    };

    // Storage status via service (no token required for /app/storage/status)
    let storage = null;
    try { storage = await storageStatus(); } catch (_) { storage = null; }

    // Storage health route
    const storageHealth = await ping((appCypherConfig.STORAGE_API_URL || 'http://localhost:6601') + '/health');

    // Frontend
    const frontendUrl = (appCypherConfig.CLIENT_URL || 'http://localhost:3000/').replace(/\/$/, '');
    const frontend = await ping(frontendUrl);

    const aggregate = {
      ok: backend.ok && storageHealth.ok && frontend.ok,
      ts: Date.now(),
      backend,
      storage_status: storage,
      storage_health: storageHealth,
      frontend,
    };

    res.json(aggregate);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

module.exports = { monitor };

