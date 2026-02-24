module.exports = function (app) {
  const mongoose = require('mongoose');
  app.get('/api/dev/ping', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'unknown', time: new Date().toISOString() });
  });
  app.get('/api/dev/db', async (req, res) => {
    try {
      const state = mongoose.connection && mongoose.connection.readyState;
      let pingOk = false;
      try { await mongoose.connection.db.command({ ping: 1 }); pingOk = true; } catch (_) {}
      res.json({ ok: state === 1 && pingOk, state, pingOk });
    } catch (e) {
      res.status(500).json({ ok: false, error: e && (e.message || String(e)) });
    }
  });
}

