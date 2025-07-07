const db = require('../models');
const mail = require('../middlewares/mail');
require('dotenv').config();
const Gallery = db.gallery;
const Tag = db.tag;

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
    return res.status(400).send({
      message: 'Fields cannot be empty',
    });
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
                  console.log(err);
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
        res.status(500).send({
          message: err.message || 'Error Creating Gallery',
        });
      });


  const options = mail.getMailOptions('pmosi76@gmail.com', req, 'content');


  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
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
              res.send({
                id: data._id,
                views: data.views,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error View gallery',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Gallery not found id ' + id,
          });
        }
        return res.status(500).send({
          message: 'Gallery not update id ' + id,
        });
      });
};


exports.deleteGallery = (req, res) => {
  Gallery.findById(req.params.id)
      .then((gallery) => {
        if (!gallery) {
          return res.status(404).send({
            message: 'Gallery not found id ' + req.params.id,
          });
        }

        if (!gallery.artists.includes(req.userId)) {
          return res.status(404).send({
            message: 'You are not authorized to delete this gallery',
          });
        }
        gallery.remove()
            .then((data) => {
              res.send({
                id: data._id,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message ||
                'Could not delete Gallery id ' + req.params.id,
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Gallery not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Could not delete Gallery id ' + req.params.id,
        });
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
    return res.status(404).send({
      message: 'Gallery not found id ' + id,
    });
  }

  if (!gallery.artists.includes(userId)) {
    return res.status(404).send({
      message: 'You are not authorized to edit this gallery',
    });
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
                  console.log(err);
                });
          }

          if (element) {
            gallery.tag.push(element._id);
          }
        });
        await Promise.all(tagPromises);
        await gallery.save();

        res.send({
          id: gallery._id,
        });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Gallery not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Gallery not update id ' + req.params.id,
        });
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
          return res.status(404).send({
            message: 'Gallery not found',
          });
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

        res.send({
          id: gallery._id,
          like: gallery.like,
          likes: gallery.likes,
        });

        // res.send({});
      }).catch((err) => {
        return res.status(500).send({
          message: 'Error liking Gallery',
        });
      });
};

// setGalleryExhibition
exports.setGalleryExhibition = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const gallery = await Gallery.findOne({_id: id});

  if (!gallery) {
    res.status(404).send({message: 'Gallery Not found.'});
    return;
  }

  if (!gallery.artists.includes(userId)) {
    res.status(404).send({message: 'You are not the owner of this gallery.'});
    return;
  }

  gallery.exhibition = !gallery.exhibition;

  gallery.save((err, gallery) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }
    res.status(200).send({
      id: gallery._id,
      exhibition: gallery.exhibition,
    });
  });
};
