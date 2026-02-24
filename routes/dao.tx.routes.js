const { authJwt } = require('../middlewares');
const asyncWrap = require('../middlewares/asyncWrap');
const dao = require('../services/dao.service');

module.exports = function(app) {
  // Build client-side transactions for membership requests and votes
  app.post('/api/dao/tx/membership/request', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const t = String((req.body && req.body.type) || '').toLowerCase();
    if (!['creator','thinker'].includes(t)) return res.status(400).json({ ok: false, error: 'invalid_type' });
    const fn = t === 'creator' ? 'requestCreatorMembership' : 'requestThinkerMembership';
    const tx = await dao.buildTx(fn);
    if (!tx.ok) return res.status(503).json(tx);
    res.json(tx);
  }));

  app.post('/api/dao/tx/membership/vote', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const id = req.body && req.body.requestId;
    if (!id && id !== 0) return res.status(400).json({ ok: false, error: 'requestId_required' });
    const tx = await dao.buildTx('voteMembershipRequest', [id]);
    if (!tx.ok) return res.status(503).json(tx);
    res.json(tx);
  }));

  // Project request tx builders
  app.post('/api/dao/tx/project/create', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const { name, description, creators, budget, deadline } = req.body || {};
    if (!name || !description || !Array.isArray(creators)) return res.status(400).json({ ok: false, error: 'invalid_payload' });
    const tx = await dao.buildTx('createProjectRequest', [name, description, creators, budget||0, deadline||0]);
    if (!tx.ok) return res.status(503).json(tx);
    res.json(tx);
  }));

  app.post('/api/dao/tx/project/vote', [authJwt.verifyToken], asyncWrap(async (req, res) => {
    const { requestId, valueEth } = req.body || {};
    if (typeof requestId === 'undefined' || !valueEth) return res.status(400).json({ ok: false, error: 'requestId_and_value_required' });
    const tx = await dao.buildTx('voteProjectRequest', [requestId], valueEth);
    if (!tx.ok) return res.status(503).json(tx);
    res.json(tx);
  }));
};

