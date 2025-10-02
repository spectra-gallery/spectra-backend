/* eslint-disable max-len */
const { authJwt } = require('../middlewares');
const { objectId } = require('../middlewares');
const controller = require('../controllers/timeline.controller');
const asyncWrap = require('../middlewares/asyncWrap');
const db = require('../models');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      'Access-Control-Allow-Headers',
      'x-access-token, Origin, Content-Type, Accept',
      'x-refresh-token, Origin, Content-Type, Accept',
      'session-token, Origin, Content-Type, Accept',
      'session-refresh, Origin, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
  });

  // tag for author checks
  app.use('/api/timeline', (req, res, next) => { req.target = 'timeline'; next(); });

  // helper middleware allowing admin, reviewer, or creator
  const allowEditors = async (req, res, next) => {
    try {
      const user = await db.user.findById(req.userId).lean().exec();
      const roles = await db.role.find({ _id: { $in: user.role } }).lean().exec();
      const names = roles.map(r => r.name);
      if (names.includes('admin') || names.includes('reviewer') || names.includes('creator')) return next();
      return res.status(403).send({ message: 'Require Admin/Reviewer/Creator role!' });
    } catch (e) {
      return res.status(401).send({ message: 'Unauthorized' });
    }
  };

  // edit access: admin/reviewer/creator OR author OR same tribe (if not reviewed). If reviewed, only admin/reviewer.
  const canEditTimeline = async (req, res, next) => {
    try {
      const [user, ev] = await Promise.all([
        db.user.findById(req.userId).lean().exec(),
        db.timeline.findById(req.params.id).lean().exec()
      ])
      if (!ev) return res.status(404).send({ message: 'not_found' })
      const roles = await db.role.find({ _id: { $in: user.role } }).lean().exec();
      const names = roles.map(r => r.name)
      const isEditor = names.includes('admin') || names.includes('reviewer') || names.includes('creator')
      const isAdminOrReviewer = names.includes('admin') || names.includes('reviewer')
      const isAuthor = String(ev.author) === String(user._id)
      const sameTribe = ev.tribe && Array.isArray(user.tribes) && user.tribes.some(t => String(t) === String(ev.tribe))

      if (ev.reviewed) {
        if (isAdminOrReviewer) return next()
        return res.status(403).send({ message: 'Reviewed content: admin/reviewer only' })
      }

      if (isEditor || isAuthor || sameTribe) return next()
      return res.status(403).send({ message: 'Forbidden' })
    } catch (e) { return res.status(401).send({ message: 'Unauthorized' }) }
  }

  // list + filters
  app.get('/api/timeline', [authJwt.verifySession], asyncWrap(controller.list));
  // get by id
  app.get('/api/timeline/:id', [authJwt.verifySession, objectId.isValidObjectId], asyncWrap(controller.getById));
  // create
  app.post('/api/timeline', [authJwt.verifyToken, allowEditors], asyncWrap(controller.create));
  // update (author or editors)
  app.put('/api/timeline/:id', [authJwt.verifyToken, objectId.isValidObjectId, canEditTimeline], asyncWrap(controller.update));
  // delete
  app.delete('/api/timeline/:id', [authJwt.verifyToken, objectId.isValidObjectId, canEditTimeline], asyncWrap(controller.remove));
};
