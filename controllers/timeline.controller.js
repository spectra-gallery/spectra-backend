const db = require('../models');
const TimelineEvent = db.timeline;
const User = db.user;

function parseQuery (req) {
  const {
    q,
    category,
    type,
    medium,
    tag,
    from,
    to,
    hasEnd,
    intensityMin,
    intensityMax,
    reviewed,
    author,
    meta
  } = req.query;

  const where = {};
  if (q) where.$text = { $search: q };
  if (category) where.category = { $in: String(category).split(',') };
  if (type) where.type = { $in: String(type).split(',') };
  if (medium) where.medium = { $in: String(medium).split(',') };
  if (tag) where.tags = { $in: String(tag).split(',') };
  if (reviewed !== undefined) where.reviewed = String(reviewed) === 'true';
  if (author) where.author = author;
  if (meta) {
    try {
      const m = typeof meta === 'string' ? JSON.parse(meta) : meta
      if (m && typeof m === 'object') {
        for (const [k, v] of Object.entries(m)) {
          where[`metadata.${k}`] = v
        }
      }
    } catch (e) {
      // ignore malformed meta
    }
  }

  if (from || to) {
    where.start = {};
    if (from) where.start.$gte = new Date(from);
    if (to) where.start.$lte = new Date(to);
  }
  if (hasEnd !== undefined) {
    if (String(hasEnd) === 'true') where.end = { $ne: null };
    else where.$or = [{ end: null }, { end: { $exists: false } }];
  }
  const imin = intensityMin !== undefined ? Number(intensityMin) : undefined;
  const imax = intensityMax !== undefined ? Number(intensityMax) : undefined;
  if (imin !== undefined || imax !== undefined) {
    where.intensity = {};
    if (imin !== undefined) where.intensity.$gte = imin;
    if (imax !== undefined) where.intensity.$lte = imax;
  }
  return where;
}

function sortOrder (s) {
  switch (s) {
    case 'date_asc': return { start: 1 };
    case 'intensity_desc': return { intensity: -1 };
    case 'intensity_asc': return { intensity: 1 };
    case 'date_desc':
    default: return { start: -1 };
  }
}

exports.list = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Math.min(200, Number(req.query.limit || 50));
  const skip = (page - 1) * limit;
  const where = parseQuery(req);
  const sort = sortOrder(req.query.sort);

  const [items, total] = await Promise.all([
    TimelineEvent.find(where).sort(sort).skip(skip).limit(limit).lean().exec(),
    TimelineEvent.countDocuments(where)
  ]);
  res.status(200).send({ ok: true, data: items, page, limit, total, reqId: req.context && req.context.id });
};

exports.getById = async (req, res) => {
  const id = req.params.id;
  const item = await TimelineEvent.findById(id).lean().exec();
  if (!item) return res.status(404).send({ ok: false, error: 'not_found', reqId: req.context && req.context.id });
  res.status(200).send({ ok: true, data: item, reqId: req.context && req.context.id });
};

exports.create = async (req, res) => {
  const body = req.body || {};
  if (!body.label || !body.start) return res.status(400).send({ ok: false, error: 'label_and_start_required' });
  const doc = new TimelineEvent({
    label: body.label,
    description: body.description,
    category: body.category,
    type: body.type || 'point',
    medium: body.medium || [],
    tags: body.tags || [],
    source: body.source,
    start: new Date(body.start),
    end: body.end ? new Date(body.end) : undefined,
    intensity: typeof body.intensity === 'number' ? body.intensity : 0.5,
    metadata: body.metadata || {},
    tribe: body.tribe || undefined,
    author: req.userId,
    reviewed: !!body.reviewed
  });
  await doc.save();
  res.status(201).send({ ok: true, data: { id: doc._id }, reqId: req.context && req.context.id });
};

exports.update = async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const update = {};
  const allowed = ['label', 'description', 'category', 'type', 'medium', 'tags', 'source', 'start', 'end', 'intensity', 'metadata', 'reviewed'];
  for (const k of allowed) {
    if (k in body) update[k] = k === 'start' || k === 'end' ? (body[k] ? new Date(body[k]) : null) : body[k];
  }
  update.updatedAt = new Date();
  const doc = await TimelineEvent.findByIdAndUpdate(id, update, { new: true }).lean().exec();
  if (!doc) return res.status(404).send({ ok: false, error: 'not_found', reqId: req.context && req.context.id });
  res.status(200).send({ ok: true, data: doc, reqId: req.context && req.context.id });
};

exports.remove = async (req, res) => {
  const id = req.params.id;
  const r = await TimelineEvent.findByIdAndDelete(id).exec();
  if (!r) return res.status(404).send({ ok: false, error: 'not_found', reqId: req.context && req.context.id });
  res.status(200).send({ ok: true, reqId: req.context && req.context.id });
};
