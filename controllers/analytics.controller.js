const db = require('../models');

exports.summary = async (req, res) => {
  try {
    const [users, posts, podcasts, exhibitions, series] = await Promise.all([
      db.user.countDocuments(),
      db.post.countDocuments(),
      db.podcast.countDocuments(),
      db.exhibition.countDocuments(),
      db.serie.countDocuments(),
    ]);

    // Top by likes (podcasts)
    const topPodcasts = await db.podcast.aggregate([
      { $project: { name: 1, slug: 1, likesCount: { $size: { $ifNull: [ '$like', [] ] } } } },
      { $sort: { likesCount: -1 } },
      { $limit: 5 },
    ]).exec();

    // Top by likes (exhibitions)
    const topExhibitions = await db.exhibition.aggregate([
      { $project: { name: 1, slug: 1, display: 1, likesCount: { $size: { $ifNull: [ '$like', [] ] } } } },
      { $sort: { likesCount: -1 } },
      { $limit: 5 },
    ]).exec();

    res.json({ ok: true, counts: { users, posts, podcasts, exhibitions, series }, top: { podcasts: topPodcasts, exhibitions: topExhibitions } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

exports.daily = async (req, res) => {
  try {
    const type = (req.query.type || 'post').toLowerCase();
    const days = Math.max(1, Math.min(365, parseInt(req.query.days || '30', 10)));
    const cutoff = new Date(Date.now() - days * 86400e3).toISOString();
    const map = { post: db.post, podcast: db.podcast, exhibition: db.exhibition, serie: db.serie };
    const Model = map[type];
    if (!Model) return res.status(400).json({ ok: false, error: 'Invalid type' });
    const rows = await Model.aggregate([
      { $match: { date: { $gte: cutoff } } },
      { $project: { day: { $substr: ['$date', 0, 10] } } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).exec();
    // Fill missing days
    const out = [];
    const idx = new Map(rows.map(r => [r._id, r.count]));
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
      out.push({ day: d, count: idx.get(d) || 0 });
    }
    res.json({ ok: true, type, days, series: out });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

exports.weekly = async (req, res) => {
  try {
    const type = (req.query.type || 'post').toLowerCase();
    const weeks = Math.max(1, Math.min(52, parseInt(req.query.weeks || '12', 10)));
    const map = { post: db.post, podcast: db.podcast, exhibition: db.exhibition, serie: db.serie };
    const Model = map[type];
    if (!Model) return res.status(400).json({ ok: false, error: 'Invalid type' });
    const since = new Date(Date.now() - weeks * 7 * 86400e3);
    const rows = await Model.aggregate([
      { $match: { date: { $gte: since.toISOString() } } },
      { $addFields: { dateObj: { $dateFromString: { dateString: '$date' } } } },
      { $group: { _id: { y: { $isoWeekYear: '$dateObj' }, w: { $isoWeek: '$dateObj' } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.w': 1 } }
    ]).exec();
    res.json({ ok: true, type, weeks, series: rows.map(r => ({ year: r._id.y, week: r._id.w, count: r.count })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

exports.artistDaily = async (req, res) => {
  try {
    const artist = req.query.artist;
    const days = Math.max(1, Math.min(365, parseInt(req.query.days || '30', 10)));
    if (!artist) return res.status(400).json({ ok: false, error: 'Missing artist' });
    const cutoff = new Date(Date.now() - days * 86400e3).toISOString();
    const oid = require('mongoose').Types.ObjectId(artist);

    const agg = async (Model, field) => Model.aggregate([
      { $match: { [field]: oid, date: { $gte: cutoff } } },
      { $project: { day: { $substr: ['$date', 0, 10] } } },
      { $group: { _id: '$day', count: { $sum: 1 } } }
    ]).exec();

    const [p1, p2, p3] = await Promise.all([
      agg(db.post, 'author'),
      agg(db.podcast, 'author'),
      agg(db.serie, 'artists')
    ]);

    const counts = new Map();
    for (const arr of [p1, p2, p3]) for (const r of arr) counts.set(r._id, (counts.get(r._id) || 0) + r.count);
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
      out.push({ day: d, count: counts.get(d) || 0 });
    }
    res.json({ ok: true, artist, days, series: out });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

exports.topArtists = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '10', 10)));
    // Count contributions across Post.author, Podcast.author, Serie.artists
    const countFrom = async (Model, field) => Model.aggregate([
      { $unwind: `$${field}` },
      { $group: { _id: `$${field}`, c: { $sum: 1 } } }
    ]).exec();
    const [p1, p2, p3] = await Promise.all([
      countFrom(db.post, 'author'),
      countFrom(db.podcast, 'author'),
      countFrom(db.serie, 'artists')
    ]);
    const acc = new Map();
    for (const arr of [p1, p2, p3]) {
      for (const r of arr) acc.set(String(r._id), (acc.get(String(r._id)) || 0) + r.c);
    }
    const entries = Array.from(acc.entries()).sort((a,b)=>b[1]-a[1]).slice(0, limit);
    const ids = entries.map(([id]) => require('mongoose').Types.ObjectId(id));
    const users = await db.user.find({ _id: { $in: ids } }, { username: 1, slug: 1, imageUrl: 1 }).lean().exec();
    const uidx = new Map(users.map(u => [String(u._id), u]));
    const top = entries.map(([id, n]) => ({ user: uidx.get(id) || { _id: id }, count: n }));
    res.json({ ok: true, top });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};
