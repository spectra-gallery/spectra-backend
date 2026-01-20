const asyncWrap = require('../middlewares/asyncWrap');
const axios = require('axios');

module.exports = function(app) {
  app.get('/api/ops/status', asyncWrap(async (req, res) => {
    const out = { ok: true, llm: { ok: null, url: null }, swarm: { configured: false, ok: null, stack: null, managerUrl: null } };
    const url = process.env.LLM_CHAT_URL || '';
    out.llm.url = url || null;
    if (url) {
      try {
        await axios.head(url, { timeout: 3000 });
        out.llm.ok = true;
      } catch (_e) {
        try {
          // Some endpoints may not support HEAD; try a lightweight POST with noop prompt
          await axios.post(url, { prompt: 'ping' }, { timeout: 4000 });
          out.llm.ok = true;
        } catch (e2) {
          out.llm.ok = false;
          out.llm.error = (e2 && e2.message) || String(e2);
        }
      }
    }
    // Swarm configuration via env; optional manager probe
    const stack = process.env.SWARM_STACK || process.env.HYPERGRAPH_STACK || null;
    const enabled = String(process.env.SWARM_ENABLED || '').toLowerCase() === '1' || Boolean(stack);
    out.swarm.configured = !!enabled;
    out.swarm.stack = stack;
    const mgr = (process.env.SWARM_MANAGER_URL || '').replace(/\/+$/, '');
    if (mgr) {
      out.swarm.managerUrl = mgr;
      try {
        // Try GET /info (Docker Engine API) or treat any 200 as success
        const info = await axios.get(mgr + '/info', { timeout: 3000 });
        out.swarm.ok = info && info.status >= 200 && info.status < 300;
        if (info && info.data) {
          // Best-effort detection of Swarm Active state
          const data = info.data;
          const active = (data && data.Swarm && (data.Swarm.LocalNodeState || '').toLowerCase() === 'active');
          if (typeof active === 'boolean') out.swarm.ok = active;
          out.swarm.nodeID = data && data.Swarm && data.Swarm.NodeID;
        }
      } catch (e3) {
        // Fallback to HEAD root
        try {
          const head = await axios.head(mgr, { timeout: 2000 });
          out.swarm.ok = head && head.status >= 200 && head.status < 400;
        } catch (e4) {
          out.swarm.ok = false;
          out.swarm.error = (e4 && e4.message) || String(e4);
        }
      }
    }
    res.json(out);
  }));
};
