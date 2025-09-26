const db = require('../models');
const Telemetry = db.telemetry;

exports.capture = async (req, res) => {
  const body = req.body || {};
  if (!body.event) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'event_required' }, reqId: req.context && req.context.id });
  const doc = new Telemetry({
    sessionId: body.sessionId,
    userId: req.userId || undefined,
    route: body.route,
    event: body.event,
    properties: body.properties || {},
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    ts: new Date()
  });
  await doc.save();
  res.status(201).send({ ok: true, data: { id: doc._id }, reqId: req.context && req.context.id });
};

exports.query = async (req, res) => {
  const { sessionId, event, limit = 100 } = req.query;
  const where = {};
  if (sessionId) where.sessionId = sessionId;
  if (event) where.event = event;
  const items = await Telemetry.find(where).sort({ createdAt: -1 }).limit(Math.min(500, Number(limit))).lean().exec();
  res.status(200).send({ ok: true, data: items, reqId: req.context && req.context.id });
};

