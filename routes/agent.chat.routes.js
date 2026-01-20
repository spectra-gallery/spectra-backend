const axios = require('axios');
const asyncWrap = require('../middlewares/asyncWrap');
const { authJwt } = require('../middlewares');
const db = require('../models');

module.exports = function(app) {
  const CHAT_URL = process.env.LLM_CHAT_URL || '';
  const DEFAULT_PERSONA = {
    name: 'twin/kobalt-sigma',
    values: ['safety-first','evidence','transparency','consent','inclusion'],
    notes: 'Twin persona for agentic sense-making in Spectra stack.'
  };
  app.post('/api/agent/chat', [authJwt.verifySession], asyncWrap(async (req, res) => {
    const { prompt, persona } = req.body || {};
    if (!prompt) return res.status(400).json({ ok: false, error: 'prompt_required' });
    if (!CHAT_URL) return res.status(503).json({ ok: false, error: 'llm_chat_url_not_configured' });
    const actor = req.userId ? `user:${req.userId}` : 'anonymous';
    const twin = persona || DEFAULT_PERSONA;
    let output, status = 200;
    try {
      const r = await axios.post(CHAT_URL, { prompt, persona: twin }, { timeout: 20000 });
      output = r.data;
    } catch (e) {
      status = 502;
      output = { error: 'llm_upstream_error', detail: String(e && e.message ? e.message : e) };
    }
    // provenance log (best-effort)
    try {
      await db.provenance.create({
        actor,
        action: 'agent.chat',
        input: { prompt, persona: twin },
        output,
        tags: ['agent','chat','twin','provenance'],
        risk: 'low'
      });
    } catch (_) {}
    res.status(status).json({ ok: status === 200, data: output });
  }));
};
