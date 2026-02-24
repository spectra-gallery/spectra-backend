const db = require('../models');
const mail = require('../middlewares/mail');
require('dotenv').config();
const Gallery = db.gallery;
const Tag = db.tag;
const logger = require('../utils/logger');

exports.fetchGalleries = (req, res) => {
  const page = req.params.page;
  const sort = req.body.sort;

  let sorting = {date: -1};
  if (sort === 0) {
    sorting = {rank: -1};
  } else if (sort === 1) {
    sorting = {date: 1};
  } else if (sort === 2) {
    sorting = {date: -1};
  } else if (sort === 3) {
    sorting = {onSale: true};
  } else if (sort === 4) {
    sorting = {onSale: false};
  }

  const promise = new Promise((resolve, reject) => {
    Gallery.find({exhibition: true})
        .sort(sorting)
        .skip((page - 1) * 10)
        .limit(10)
        .populate('artists', 'username _id imageUrl')
        .populate('tag', '-__v')
        .populate('like', 'username _id imageUrl')
        .exec((err, galleries) => {
          resolve(galleries);
          if (err) reject(err);
        });
  });
  return promise;
};

exports.fetchGalleryById = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Gallery.findOne({_id: id, exhibition: true})
        .populate('artists', 'username _id imageUrl')
        .populate('tag', '-__v')
        .populate('like', 'username _id imageUrl')
        .populate('ordinals', '-__v')
        .populate({
          path: 'collections',
          populate: {
            path: 'sketch', // select all field
            select: '-__v',
          },
          select: '-__v',
        })
        .exec((err, gallery) => {
          const data = {
            id: gallery._doc._id,
            name: gallery._doc.name,
            description: gallery._doc.description,
            images: gallery._doc.images,
            artists: gallery._doc.artists,
            collections: gallery._doc.collections,
            ordinals: gallery._doc.ordinals,
            tag: gallery._doc.tag,
            like: gallery._doc.like,
            likes: gallery._doc.likes,
            date: gallery._doc.date,
            views: gallery._doc.views,
            comment: gallery._doc.comment,
            exhibition: gallery._doc.exhibition,
            reviewed: gallery._doc.reviewed,
          };
          resolve(data);
          if (err) reject(err);
        });
  });
  return promise;
};

exports.createGallery = (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'fields_required' }, reqId: req.context && req.context.id });
  }

  const userId = req.userId;

  const gallery = new Gallery({
    name: req.body.name,
    description: req.body.description,
    images: req.body.images,
    artists: [userId, ...req.body.collabs],
    collections: req.body.collections,
    ordinals: req.body.ordinals,
  });
  gallery.save()
      .then(async (_gallery) => {
        const tagArray = req.body.tag;

        const tagPromises = tagArray.map(async (tag) => {
          const element = await Tag.findOne({
            name: tag,
          });

          if (!element) {
            const _tag = new Tag({
              name: tag,
            });

            await _tag.save()
                .then((data) => {
                  _gallery.tag.push(data._id);
                }).catch((err) => {
                  logger.error('gallery_tag_create_failed', { err: String(err), reqId: req && req.context && req.context.id });
                });
          }
          if (element) {
            _gallery.tag.push(element._id);
          }
        });

        await Promise.all(tagPromises);
        await _gallery.save();


        res.send({
          id: _gallery._id,
        });
      }).catch((err) => {
        res.status(500).send({ ok: false, error: { code: 'internal_error', message: err.message || 'gallery_create_failed' }, reqId: req.context && req.context.id });
      });


  const options = mail.getMailOptions('pmosi76@gmail.com', req, 'content');


  mail.sendMail(options, (err, info) => {
    if (err) { logger.error('gallery_mail_send_error', { err: String(err) }) } else { logger.info('gallery_mail_sent', { info }) }
  });
};

// users galleries
exports.usersGallery = (req, res) => {
  const userId = req.userId;

  const promise = new Promise((resolve, reject) => {
    Gallery.find({artists: userId})
        .populate('artists', 'username _id imageUrl')
        .populate('tag', '-__v')
        .populate('like', 'username _id imageUrl')
        .exec((err, galleries) => {
          resolve(galleries);
          if (err) reject(err);
        });
  });
  return promise;
};

// user gallery by id
exports.userGalleryById = (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const promise = new Promise((resolve, reject) => {
    Gallery.findOne({_id: id, artists: userId})
        .populate('artists', 'username _id imageUrl')
        .populate('tag', '-__v')
        .populate('like', 'username _id imageUrl')
        .populate('ordinals', '-__v')
        .populate({
          path: 'collections',
          populate: {
            path: 'sketch', // select all field
            select: '-__v',
          },
          select: '-__v',
        })
        .exec((err, gallery) => {
          const data = {
            id: gallery._doc._id,
            name: gallery._doc.name,
            description: gallery._doc.description,
            images: gallery._doc.images,
            artists: gallery._doc.artists,
            collections: gallery._doc.collections,
            ordinals: gallery._doc.ordinals,
            tag: gallery._doc.tag,
            like: gallery._doc.like,
            likes: gallery._doc.likes,
            date: gallery._doc.date,
            views: gallery._doc.views,
            comment: gallery._doc.comment,
            exhibition: gallery._doc.exhibition,
            reviewed: gallery._doc.reviewed,
          };
          resolve(data);
          if (err) reject(err);
        });
  });
  return promise;
};

exports.fetchTag = () => {
  const promise = new Promise((resolve, reject) => {
    Tag.find({}).exec((err, tags) => {
      resolve(tags);
      if (err) reject(err);
    });
  });
  return promise;
};

// set collection views
exports.setViews = (req, res) => {
  const id = req.params.id;

  Gallery.findById(id)
      .then((gallery) => {
        if (!gallery) {
          return res.status(404).send({
            message: 'Gallery not found id ' + id,
          });
        }

        gallery.views = gallery.views + 1;

        gallery.save()
            .then((data) => {
              res.status(200).send({ ok: true, data: { id: data._id, views: data.views }, reqId: req.context && req.context.id });
            }).catch((err) => {
              res.status(500).send({ ok: false, error: { code: 'internal_error', message: err.message || 'gallery_view_error' }, reqId: req.context && req.context.id });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
        }
        return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'gallery_update_failed' }, reqId: req.context && req.context.id });
      });
};


exports.deleteGallery = (req, res) => {
  Gallery.findById(req.params.id)
      .then((gallery) => {
        if (!gallery) {
          return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
        }

        if (!gallery.artists.includes(req.userId)) {
          return res.status(403).send({ ok: false, error: { code: 'forbidden', message: 'not_owner' }, reqId: req.context && req.context.id });
        }
        gallery.remove()
            .then((data) => {
              res.status(200).send({ ok: true, data: { id: data._id }, reqId: req.context && req.context.id });
            }).catch((err) => {
              res.status(500).send({ ok: false, error: { code: 'internal_error', message: err.message || 'gallery_delete_failed' }, reqId: req.context && req.context.id });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
        }
        return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'gallery_delete_failed' }, reqId: req.context && req.context.id });
      });
};

// edit collection
exports.editGallery = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const collabs = [];

  const _collabs = req.body.collabs;

  // get all collaborators
  for (const coll of _collabs) {
    collabs.push(coll);
  }

  // check if collection.supply is greater than 0 return error
  const gallery = await Gallery.findById(id);

  if (!gallery) {
    return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
  }

  if (!gallery.artists.includes(userId)) {
    return res.status(403).send({ ok: false, error: { code: 'forbidden', message: 'not_owner' }, reqId: req.context && req.context.id });
  }

  Gallery.findByIdAndUpdate(id, {
    name: req.body.name,
    description: req.body.description,
    artists: [userId, ...collabs],
    images: req.body.images,
    tag: [],
    collections: req.body.collections,
    ordinals: req.body.ordinals,
    like: req.body.like,
    likes: req.body.likes,
    date: req.body.date,
    views: req.body.views,
    comment: req.body.comment,
  }, {new: true})
      .then(async (gallery) => {
        const tagArray = req.body.tag;

        const tagPromises = tagArray.map(async (tag) => {
          const tagName = gallery.tag.map(async (element) => {
            const fetchTag = await Tag.findById(element);
            return fetchTag.name;
          });
          if (tagName.includes(tag)) {
            return;
          }

          const element = await Tag.findOne({
            name: tag,
          });

          if (!element) {
            const tag = new Tag({
              name: tag,
            });

            await tag.save()
                .then((data) => {
                  gallery.tag.push(data._id);
                }).catch((err) => {
                  logger.error('gallery_tag_push_failed', { err: String(err), reqId: req && req.context && req.context.id });
                });
          }

          if (element) {
            gallery.tag.push(element._id);
          }
        });
        await Promise.all(tagPromises);
        await gallery.save();

        res.status(200).send({ ok: true, data: { id: gallery._id }, reqId: req.context && req.context.id });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
        }
        return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'gallery_update_failed' }, reqId: req.context && req.context.id });
      });
};

exports.fetchGalleryByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Gallery.find({
      artists: id,
      exhibition: true,
    })
        .populate('artists', 'username _id imageUrl')
        .populate('tag', '-__v')
        .populate('like', 'username _id imageUrl')
        .exec((err, galleries) => {
          resolve(galleries);
          if (err) reject(err);
        });
  });
  return promise;
};


exports.likeGallery = (req, res) => {
  Gallery.findById(req.params.id)
      .then((gallery) => {
        if (!gallery) {
          return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
        }

        const like = gallery.like;
        let likes = gallery.likes;
        const id = req.userId;

        if (like.includes(id)) {
          const index = like.findIndex((user) => user == id);
          if (index > -1) {
            like.splice(index, 1);
            if (likes > 0) likes -= 1;
          }
        } else {
          like.push(id);
          likes += 1;
        }

        gallery.like = like;
        gallery.likes = likes;
        gallery.save();

        res.status(200).send({ ok: true, data: { id: gallery._id, like: gallery.like, likes: gallery.likes }, reqId: req.context && req.context.id });

        // res.send({});
      }).catch((err) => {
        return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'gallery_like_failed' }, reqId: req.context && req.context.id });
      });
};

// setGalleryExhibition
exports.setGalleryExhibition = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const gallery = await Gallery.findOne({_id: id});

  if (!gallery) {
    res.status(404).send({ ok: false, error: { code: 'not_found', message: 'gallery_not_found' }, reqId: req.context && req.context.id });
    return;
  }

  if (!gallery.artists.includes(userId)) {
    res.status(403).send({ ok: false, error: { code: 'forbidden', message: 'not_owner' }, reqId: req.context && req.context.id });
    return;
  }

  gallery.exhibition = !gallery.exhibition;

  gallery.save((err, gallery) => {
    if (err) {
      res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(err) }, reqId: req.context && req.context.id });
      return;
    }
    res.status(200).send({ ok: true, data: { id: gallery._id, exhibition: gallery.exhibition }, reqId: req.context && req.context.id });
  });
};
