const appCypherConfig = require('../config/app.cypher.config');
const { storageStatus } = require('../services/storageSetup');

module.exports = function(app) {
  app.get('/api/health', async (req, res) => {
    try {
      const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
      let dbState = 0;
      if (process.env.SKIP_DB !== '1') {
        try {
          const db = require('../models');
          const mongoose = db.mongoose;
          dbState = mongoose.connection && mongoose.connection.readyState;
        } catch (_) {
          dbState = 0;
        }
      }

      let storage = null;
      try {
        storage = await storageStatus();
      } catch (_e) {
        storage = null;
      }

      res.json({
        ok: true,
        service: 'backend',
        port: appCypherConfig.PORT || 8000,
        storage_api_url: appCypherConfig.STORAGE_PUBLIC_URL,
        db: { state: dbStates[dbState] || 'unknown', code: dbState },
        storage_status: storage,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
};
