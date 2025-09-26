const db = require('../models');
const Draft = db.draft;

exports.save = async (req, res) => {
  const key = req.params.key;
  const body = req.body || {};
  if (!key) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'key_required' }, reqId: req.context && req.context.id });
  const userId = req.userId;
  const data = body.data || body;
  const doc = await Draft.findOneAndUpdate({ userId, key }, { data, updatedAt: new Date() }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  res.status(200).send({ ok: true, data: { key, updatedAt: doc.updatedAt }, reqId: req.context && req.context.id });
};

exports.get = async (req, res) => {
  const key = req.params.key;
  if (!key) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'key_required' }, reqId: req.context && req.context.id });
  const userId = req.userId;
  const doc = await Draft.findOne({ userId, key }).lean();
  if (!doc) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'draft_not_found' }, reqId: req.context && req.context.id });
  res.status(200).send({ ok: true, data: { key, data: doc.data, updatedAt: doc.updatedAt }, reqId: req.context && req.context.id });
};

exports.remove = async (req, res) => {
  const key = req.params.key;
  if (!key) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'key_required' }, reqId: req.context && req.context.id });
  const userId = req.userId;
  await Draft.deleteOne({ userId, key });
  res.status(200).send({ ok: true, data: { key }, reqId: req.context && req.context.id });
};

