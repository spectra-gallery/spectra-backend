const db = require('../models');
const mail = require('../middlewares/mail');
// const discord = require('../middlewares/discord');
require('dotenv').config();
const Generative = db.generative;
const Whitelist = db.whitelist;
const Category = db.category;
const Sketch = db.sketch;
const User = db.user;
const Role = db.role;

// slug to generative id
exports.slugToId = async (req, res) => {
  const slug = req.params.slug;

  const generative = await Generative.findOne({slug: slug});

  if (!generative) {
    return res.status(404).send({
      message: 'Generative not found',
    });
  }

  res.send({
    id: generative._id,
  });
};


exports.fetchCollections = (req, res) => {
  // const page = req.params.page;
  const sort = parseInt(req.query.sort);

  let sorting = {date: -1};
  if (sort === 0) {
    sorting = {date: -1};
  } else if (sort === 1) {
    sorting = {onSale: -1};
  } else if (sort === 2) {
    sorting = {price: 1};
  } else if (sort === 3) {
    sorting = {price: -1};
  }

  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort(sorting)
    // .skip((page - 1) * 10)
    // .limit(10)
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
    // .populate('sketch', '_id hash url sizeBytes')
    // .populate("like", "username _id imageUrl slug")
        .exec((err, collections) => {
          if (!collections) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of collections) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              // onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              views: coll.views,
              likes: coll.likes,
              date: coll.date,
              // featured: coll.featured,
              like: coll.like,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

exports.getAllCollections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .populate('artists', 'username _id imageUrl slug')
        .exec((err, collections) => {
          if (!collections) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of collections) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
            });

            if (err) {
              reject(err);
            } else {
              resolve(collectionObj);
            }
          }
        });
  });
  return promise;
};

exports.fetchAllCollectionsByNumber = (req, res) => {
  const number = parseInt(req.params.number);

  const sort = parseInt(req.query.sort);

  let sorting = {date: -1};
  if (sort === 0) {
    sorting = {date: -1};
  } else if (sort === 1) {
    sorting = {onSale: -1};
  } else if (sort === 2) {
    sorting = {price: 1};
  } else if (sort === 3) {
    sorting = {price: -1};
  }

  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort(sorting)
        .limit(number)
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('whitelist', '-__v')
    // .populate('sketch', '_id hash url sizeBytes')
    // .populate("like", "username _id imageUrl slug")
        .exec((err, collections) => {
          if (!collections) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of collections) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              views: coll.views,
              likes: coll.likes,
              date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }

          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });

  return promise;
};

exports.fetchGalleryCollections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('sketch', '_id hash url sizeBytes')
    // .populate("like", "username _id imageUrl slug")
        .populate({
          path: 'inscriptions',
          populate: {
            path: 'ordinal',
            select: '-__v',
          },
          select: '-__v',
        })
        .exec((err, collections) => {
          if (err) reject(err);
          else {
            resolve(collections);
          }
        });
  });
  return promise;
};

exports.fetchCollectionById = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Generative.findById(id)
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('sketch', '_id hash url sizeBytes')
        .populate('whitelist', '-__v')
    // .populate("like", "username _id imageUrl slug")
        .exec((err, generative) => {
          if (!generative) {
            return resolve({});
          }

          const description = generative._doc.description;
          // .replace(/\\n/g, '\n');

          const data = {
            id: generative._doc._id,
            name: generative._doc.name,
            slug: generative._doc.slug,
            subtitle: generative._doc.subtitle,
            description: description,
            image: generative._doc.image,
            sketch: generative._doc.sketch,
            inscriptions: generative._doc.inscriptions,
            artists: generative._doc.artists,
            captureDelay: generative._doc.captureDelay,
            cssSelector: generative._doc.cssSelector,
            autoCenter: generative._doc.autoCenter,
            backgroundColor: generative._doc.backgroundColor,
            inscribing: generative._doc.inscribing,
            onSale: generative._doc.onSale,
            views: generative._doc.views,
            onSaleInscriptions: generative._doc.onSaleInscriptions,
            rank: generative._doc.rank,
            like: generative._doc.like,
            likes: generative._doc.likes,
            supply: generative._doc.supply,
            totalSupply: generative._doc.totalSupply,
            price: generative._doc.price,
            royalty: generative._doc.royalty,
            volume: generative._doc.volume,
            rank: generative._doc.rank,
            date: generative._doc.date,
            modified: generative._doc.modified,
            category: generative._doc.category,
            link: generative._doc.link,
            whitelist: generative._doc.whitelist,
          };
          if (err) reject(err);
          else {
            resolve(data);
          }
        });
  });
  return promise;
};

// fetch random collections using aggregate
exports.fetchRandomCollection = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.aggregate([{$sample: {size: 1}},
      {
        $lookup: {
          from: 'users',
          localField: 'artists',
          foreignField: '_id',
          as: 'artists',
          pipeline: [
            {
              $project: {
                username: 1,
                _id: 1,
                imageUrl: 1,
                slug: 1,
              },
            },
          ],
        },
      },

    ])
        .exec((err, collections) => {
          if (!collections) {
            return resolve({});
          }

          const data = {
            id: collections[0]._id,
            name: collections[0].name,
            slug: collections[0].slug,
            description: collections[0].description,
            image: collections[0].image,
            artists: collections[0].artists,
            supply: collections[0].supply,
            totalSupply: collections[0].totalSupply,
          };

          if (err) reject(err);
          else {
            resolve(data);
          }
        });
  });

  return promise;
};

/*
exports.fetchRandomCollection = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .populate('artists', 'username _id imageUrl slug')
        // .populate('category', '-__v')
    // .populate('sketch', '_id hash url sizeBytes')
    // .populate("like", "username _id imageUrl slug")
        .exec((err, collections) => {
          if (!collections) {
            return resolve({});
          }

          const random = Math.floor(Math.random() * collections.length) || 0;

          const data = {
            id: collections[random]._doc._id,
            name: collections[random]._doc.name,
            slug: collections[random]._doc.slug,
            description: collections[random]._doc.description,
            image: collections[random]._doc.image,
            // sketch: collections[random]._doc.sketch,
            // inscriptions: collections[random]._doc.inscriptions,
            artists: collections[random]._doc.artists,
            // captureDelay: collections[random]._doc.captureDelay,
            // onSale: collections[random]._doc.onSale,
            // views: collections[random]._doc.views,
            // rank: collections[random]._doc.rank,
            // like: collections[random]._doc.like,
            // likes: collections[random]._doc.likes,
            supply: collections[random]._doc.supply,
            totalSupply: collections[random]._doc.totalSupply,
            // price: collections[random]._doc.price,
            // royalty: collections[random]._doc.royalty,
            // volume: collections[random]._doc.volume,
            // date: collections[random]._doc.date,
            // category: collections[random]._doc.category,
            // link: collections[random]._doc.link,
          };

          resolve(data);

          if (err) reject(err);
        });
  });

  return promise;
};
*/

exports.generateSketch = async (req, res) => {
  const htmlContent = req.body.htmlContent;
  const fileUrl = req.body.fileUrl;
  const sizeBytes = req.body.sizeBytes;

  const sketch = new Sketch({
    htmlContent: htmlContent,
    url: fileUrl,
    hash: '',
    sizeBytes: sizeBytes,
  });

  await sketch.save();

  res.status(200).send({
    id: sketch._id,
  });
};

exports.createCollection = async (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: 'Fields cannot be empty',
    });
  }
  // const loggedInUser = loginController.getLoggedInUserObject(req, res);
  const sketchId = req.body.sketch.id;

  const userId = req.userId;

  const user = await User.findById(userId);

  // get sketch by id
  Sketch.findById(sketchId)
      .then((sketch) => {
        if (!sketch) {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        } else {
          sketch.hash = req.body.sketch.hash;
          return sketch.save();
        }
      })
      .then((sketch) => {
        const slug = req.body.name.toLowerCase().replace(/ /g, '-');

        const whitelistIds = req.body.whitelisted.map((wh) => {
          return new Whitelist({
            address: wh.address,
            value: Math.floor(wh.value * Math.pow(10, 8)),
          }).save()._id;
        });

        new Generative({
          name: req.body.name,
          slug: slug,
          subtitle: req.body.subtitle,
          description: req.body.description,
          sketch: sketch._id,
          artists: [userId, ...req.body.collabs],
          captureDelay: req.body.captureDelay,
          cssSelector: req.body.cssSelector || 'body',
          autoCenter: req.body.autoCenter || false,
          backgroundColor: req.body.backgroundColor || '#F2F0EC',
          onSale: req.body.onSale,
          totalSupply: req.body.totalSupply,
          price: req.body.price,
          royalty: req.body.royalty,
          link: req.body.link,
          image: req.body.image,
          whitelist: whitelistIds,
        }).save()
            .then(async (generative) => {
              const categoryArray = req.body.category;

              const categoryPromises = categoryArray.map(async (cat) => {
                const element = await Category.findOne({
                  name: cat,
                });

                if (!element) {
                  const category = new Category({
                    name: cat,
                  });

                  await category.save()
                      .then((data) => {
                        generative.category.push(data._id);
                      }).catch((err) => {
                        console.log(err);
                      });
                }
                if (element) {
                  generative.category.push(element._id);
                }
              });

              await Promise.all(categoryPromises);
              await generative.save();


              res.send({
                id: generative._id,
                slug: generative.slug,
              });

              const emailTo = user.email || 'info@function.gallery';

              sendMail(emailTo, generative, 'content');

              const title = `New Generative Created | ${generative.name}`;
              const content = `${generative.name} by ${generative.artists[0]}`;

              discord.sendNotification(title, content, generative.image);
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error Creating Generative',
              });
            });
      })
      .catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }
        return res.status(500).send({
          message: 'Sketch not update id ' + sketchId,
        });
      });
};

/**
   * Send mail to the recipient.

   * @param {string} to - The recipient email address.
   * @param {object} data - The data to include in the email.
   * @param {string} type - The type of email.
   */
function sendMail(to, data, type) {
  const options = mail.getMailOptions(to, data, type);

  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}


exports.createUserCollection = (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: 'Fields cannot be empty',
    });
  }
  // const loggedInUser = loginController.getLoggedInUserObject(req, res);
  const sketchId = req.body.sketch.id;


  // get sketch by id
  Sketch.findById(sketchId)
      .then((sketch) => {
        if (!sketch) {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }

        sketch.hash = req.body.sketch.hash;
        sketch.save();
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }
        return res.status(500).send({
          message: 'Sketch not update id ' + sketchId,
        });
      });

  const slug = req.body.name.toLowerCase().replace(/ /g, '-');

  const whitelistIds = req.body.whitelisted.map((wh) => {
    return new Whitelist({
      address: wh.address,
      value: Math.floor(wh.value * Math.pow(10, 8)),
    }).save()._id;
  });

  const generative = new Generative({
    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    sketch: sketchId,
    artists: [req.body.collabs],
    captureDelay: req.body.captureDelay,
    cssSelector: req.body.cssSelector || 'body',
    autoCenter: req.body.autoCenter || false,
    backgroundColor: req.body.backgroundColor || '#F2F0EC',
    onSale: req.body.onSale,
    totalSupply: req.body.totalSupply,
    price: req.body.price,
    royalty: req.body.royalty,
    link: req.body.link,
    image: req.body.image,
    whitelist: whitelistIds,
  });
  generative.save()
      .then(async (generative) => {
        const categoryArray = req.body.category;

        const categoryPromises = categoryArray.map(async (cat) => {
          const element = await Category.findOne({
            name: cat,
          });

          if (!element) {
            const category = new Category({
              name: cat,
            });

            await category.save()
                .then((data) => {
                  generative.category.push(data._id);
                }).catch((err) => {
                  console.log(err);
                });
          }
          if (element) {
            generative.category.push(element._id);
          }
        });

        await Promise.all(categoryPromises);
        await generative.save();


        res.send({
          id: generative._id,
        });
      }).catch((err) => {
        res.status(500).send({
          message: err.message || 'Error Creating Generative',
        });
      });

  /*
  const options = mail.getMailOptions('info@function.gallery', req, 'content');


  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
  */
};

exports.createCategory = async (req, res) => {
  if (!req.body.name) {
    return res.status(400).send({
      message: 'Fields cannot be empty',
    });
  }

  const category = new Category({
    name: req.body.name,
  });

  await category.save();

  res.status(200).send({
    _id: category._id,
    name: category.name,
  });
};

exports.fetchCategory = () => {
  const promise = new Promise((resolve, reject) => {
    Category.find({}).exec((err, categories) => {
      resolve(categories);
      if (err) reject(err);
    });
  });
  return promise;
};

// delete category by id
exports.deleteCategory = (req, res) => {
  const id = req.params.id;

  Category.findByIdAndRemove(id)
      .then((category) => {
        if (!category) {
          return res.status(404).send({
            message: 'Category not found id ' + id,
          });
        } else {
          res.send({
            id: category._id,
            message: 'Category deleted successfully!',
          });
        }
      }).catch((err) => {
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
          return res.status(404).send({
            message: 'Category not found id ' + id,
          });
        }
        return res.status(500).send({
          message: 'Could not delete category id ' + id,
        });
      });
};

// set generative views
exports.setViews = (req, res) => {
  const id = req.params.id;

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }

        generative.views = generative.views + 1;
        generative.rank += 1;

        generative.save()
            .then((data) => {
              res.send({
                id: data._id,
                views: data.views,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error updating generative',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + id,
        });
      });
};

// fetch featured collections
exports.fetchFeaturedCollections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({featured: true})
        .populate('artists', 'username _id imageUrl slug')
        .populate('whitelist', '-__v')
        // .populate('category', '-__v')
        //  .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")

        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              _id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              // inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              // views: coll.views,
              likes: coll.likes,
              // date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }

          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

exports.setFeaturedCollections = async (req, res) => {
  // if req.body.featMode === 0, set featured artists randomly
  // if req.body.featMode === 1, set featured artists manually

  const featMode = req.body.featMode;
  const featIds = req.body.featIds;
  console.log(featIds);
  const collections = await Generative.find({});

  // set all featured to false
  for (const coll of collections) {
    coll.featured = false;
    await coll.save();
  }

  if (featMode === 0) {
    // set 3 random collections to featured
    for (let i = 0; i < 6; i++) {
      const random = Math.floor(Math.random() * collections.length) || 0;
      collections[random].featured = true;
      await collections[random].save();
    }
  } else if (featMode === 1) {
    // set all artists matching the ids to featured
    for (const coll of collections) {
      if (featIds.includes(coll._id.toString())) {
        coll.featured = true;
        await coll.save();
      }
    }
  }

  res.send({message: 'Featured collections updated'});
};

exports.fetchOnSaleCollections = (req, res) => {
  // const page = req.params.page;
  const sort = parseInt(req.query.sort);

  let sorting = {onSale: -1, date: -1};
  if (sort === 0) {
    sorting = {onSale: -1, date: -1};
  } else if (sort === 1) {
    sorting = {onSale: -1, rank: -1};
  } else if (sort === 2) {
    sorting = {onSale: -1, price: 1};
  } else if (sort === 3) {
    sorting = {onSale: -1, price: -1};
  }

  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort(sorting)
        // .skip((page - 1) * 10)
        // .limit(10)
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('whitelist', '-__v')
        // .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")
        .exec((err, collections) => {
          if (!collections) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of collections) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              views: coll.views,
              likes: coll.likes,
              date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

exports.fetchTrendingCollections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort({likes: -1, views: -1, supply: -1})
        .limit(4)
        .populate('artists', 'username _id imageUrl slug')
        .populate('whitelist', '-__v')
        // .populate('category', '-__v')
        // .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")

        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              _id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              // views: coll.views,
              likes: coll.likes,
              // date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

exports.fetchRecommendedCollections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort({rank: -1})
        .limit(6)
        .populate('artists', 'username _id imageUrl slug')
        .populate('whitelist', '-__v')
        // .populate('category', '-__v')
        //  .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")

        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              // views: coll.views,
              likes: coll.likes,
              // date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }

          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

// fetch recommended collections on sale
exports.fetchRecommendedCollectionsOnSale = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({onSale: true})
        .sort({rank: -1})
        .limit(6)
        .populate('artists', 'username _id imageUrl slug')
        // .populate('category', '-__v')
        // .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")

        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              // views: coll.views,
              likes: coll.likes,
              // date: coll.date,
              // featured: coll.featured,
              like: coll.like,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });

  return promise;
};

// fetch recommended collections by artist
exports.fetchRecommendedCollectionsByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Generative.find({
      artists: id,
    })
        .sort({rank: -1})
        .limit(4)
        .populate('artists', 'username _id imageUrl slug')
        // .populate('category', '-__v')
        // .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")

        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              // inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              // onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              // price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              // views: coll.views,
              likes: coll.likes,
              // date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

exports.fetchRecommendedCollectionsOmitArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Generative.find({
      artists: {$ne: id},
    })
        .sort({rank: -1})
        .limit(4)
        .populate('artists', 'username _id imageUrl slug')
        .populate('whitelist', '-__v')
        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              artists: coll.artists,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              onSale: coll.onSale,
              image: coll.image,
              likes: coll.likes,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });
  return promise;
};

// fetch latest collections
exports.fetchLatestCollections = (req, res) => {
  const number = parseInt(req.params.number);

  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort({onSale: -1, date: -1})
        .limit(number)
        .populate('artists', 'username _id imageUrl slug')
        .populate('whitelist', '-__v')
        // .populate('category', '-__v')
        // .populate('sketch', '_id hash url sizeBytes')
        // .populate("like", "username _id imageUrl slug")

        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionObj = [];

          for (const coll of generative) {
            collectionObj.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              description: coll.description,
              // sketch: coll.sketch,
              inscriptions: coll.inscriptions,
              artists: coll.artists,
              // category: coll.category,
              // captureDelay: coll.captureDelay,
              onSale: coll.onSale,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              // royalty: coll.royalty,
              // volume: coll.volume,
              // link: coll.link,
              image: coll.image,
              // views: coll.views,
              likes: coll.likes,
              // date: coll.date,
              // featured: coll.featured,
              like: coll.like,
              whitelist: coll.whitelist,
              onSaleInscriptions: coll.onSaleInscriptions,
            });
          }
          if (err) reject(err);
          else {
            resolve(collectionObj);
          }
        });
  });

  return promise;
};


// fetch latest collections by artists

exports.fetchLatestCollectionByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Generative.find({
      artists: id,
    })
        .sort({date: -1})
        .limit(4)
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('whitelist', '-__v')
        // .populate("like", "username _id imageUrl slug")
        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }
          if (err) reject(err);
          else {
            resolve(generative);
          }
        });
  });
  return promise;
};

// check if user is owner of generative and delete it
exports.deleteCollection = (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }

        if (!generative.artists.includes(userId)) {
          return res.status(401).send({
            message: 'Unauthorized',
          });
        }

        if (generative.supply > 0) {
          return res.status(404).send({
            message: 'Generative has supply id: ' + id,
          });
        }

        generative.remove()
            .then((data) => {
              res.send({
                id: id,
                message: 'Generative deleted successfully id: ' + id,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error deleting generative',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }
        return res.status(500).send({
          message: 'Generative not delete id ' + id,
        });
      });
};

// admin delete generative

exports.adminDeleteCollection = async (req, res) => {
  const id = req.params.id;

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }

        generative.remove()
            .then((data) => {
              res.send({
                id: id,
                message: 'Generative deleted successfully id: ' + id,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error deleting generative',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }
        return res.status(500).send({
          message: 'Generative not delete id ' + id,
        });
      });

  const inscriptions = await Inscription.find({collectionRef: id});

  Inscription.deleteMany({collectionRef: id})
      .then((data) => {
        console.log(data);
      }).catch((err) => {
        console.log(err);
      });

  inscriptions.forEach(async (element) => {
    const ordinal = await Ordinal.findById(element.ordinal);
    // delete ordinal
    ordinal.remove()
        .then((data) => {
          console.log(data);
        }).catch((err) => {
          console.log(err);
        });
  });
};


// edit generative
exports.editCollection = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  const collabs = [];

  // check if generative.supply is greater than 0 return error
  // and if user is owner of generative
  const generative = await Generative.findById(id);

  if (!generative) {
    return res.status(404).send({
      message: 'Generative not found id ' + id,
    });
  }
  // check if generative.artists array contains userId
  if (!generative.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: 'Unauthorized',
    });
  }

  if (generative.supply > 0) {
    return res.status(404).send({
      message: 'Generative has supply',
    });
  }

  // get all collaborators
  for (const coll of req.body.collabs) {
    collabs.push(coll);
  }
  // get sketch by id
  Sketch.findById(sketchId)
      .then((sketch) => {
        if (!sketch) {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }

        sketch.hash = req.body.sketch.hash;
        sketch.save();
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }
        return res.status(500).send({
          message: 'Sketch not update id ' + sketchId,
        });
      });

  const slug = req.body.name.toLowerCase().replace(/ /g, '-');

  const whitelisted = req.body.whitelisted;
  const whitelistIds = [];

  for (const wh of whitelisted) {
    const whitelist = new Whitelist({
      address: wh.address,
      value: Math.floor(wh.value * Math.pow(10, 8)),
    });
    await whitelist.save();
    whitelistIds.push(whitelist._id);
  }

  Generative.findByIdAndUpdate(id, {

    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    artists: [userId, ...collabs],
    captureDelay: req.body.captureDelay,
    cssSelector: req.body.cssSelector,
    autoCenter: req.body.autoCenter,
    backgroundColor: req.body.backgroundColor,
    onSale: req.body.onSale,
    totalSupply: req.body.totalSupply,
    price: req.body.price,
    royalty: req.body.royalty,
    link: req.body.link,
    image: req.body.image,
    category: [],
    sketch: sketchId,
    whitelist: whitelistIds,
    modified: new Date().toISOString(),

  }, {new: true})
      .then(async (generative) => {
        const categoryArray = req.body.category;

        const categoryPromises = categoryArray.map(async (cat) => {
          const categoryName = generative.category.map(async (element) => {
            const fetchCategory = await Category.findById(element);
            return fetchCategory.name;
          });
          if (categoryName.includes(cat)) {
            return;
          }

          const element = await Category.findOne({
            name: cat,
          });

          if (!element) {
            const category = new Category({
              name: cat,
            });

            await category.save()
                .then((data) => {
                  generative.category.push(data._id);
                }).catch((err) => {
                  console.log(err);
                });
          }

          if (element) {
            generative.category.push(element._id);
          }
        });
        await Promise.all(categoryPromises);
        await generative.save();

        res.send({
          id: generative._id,
        });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + req.params.id,
        });
      });
};

exports.editUserCollection = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;


  const collabs = [];

  // check if generative.supply is greater than 0 return error
  // and if user is owner of generative
  const generative = await Generative.findById(id);

  if (!generative) {
    return res.status(404).send({
      message: 'Generative not found id ' + id,
    });
  }


  // get all collaborators
  for (const coll of req.body.collabs) {
    collabs.push(coll);
  }
  // get sketch by id
  Sketch.findById(sketchId)
      .then((sketch) => {
        if (!sketch) {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }

        sketch.hash = req.body.sketch.hash;
        sketch.save();
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Sketch not found id ' + sketchId,
          });
        }
        return res.status(500).send({
          message: 'Sketch not update id ' + sketchId,
        });
      });

  const slug = req.body.name.toLowerCase().replace(/ /g, '-');

  Generative.findByIdAndUpdate(id, {

    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    artists: [...collabs],
    captureDelay: req.body.captureDelay,
    cssSelector: req.body.cssSelector,
    autoCenter: req.body.autoCenter,
    backgroundColor: req.body.backgroundColor,
    onSale: req.body.onSale,
    supply: req.body.supply,
    inscribing: req.body.inscribing,
    totalSupply: req.body.totalSupply,
    date: req.body.date,
    price: req.body.price,
    royalty: req.body.royalty,
    link: req.body.link,
    image: req.body.image,
    volume: req.body.volume,
    category: [],
    sketch: sketchId,
    modified: new Date().toISOString(),

  }, {new: true})
      .then(async (generative) => {
        const categoryArray = req.body.category;

        const categoryPromises = categoryArray.map(async (cat) => {
          const categoryName = generative.category.map(async (element) => {
            const fetchCategory = await Category.findById(element);
            return fetchCategory.name;
          });
          if (categoryName.includes(cat)) {
            return;
          }

          const element = await Category.findOne({
            name: cat,
          });

          if (!element) {
            const category = new Category({
              name: cat,
            });

            await category.save()
                .then((data) => {
                  generative.category.push(data._id);
                }).catch((err) => {
                  console.log(err);
                });
          }

          if (element) {
            generative.category.push(element._id);
          }
        });
        await Promise.all(categoryPromises);
        await generative.save();

        res.send({
          id: generative._id,
        });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + req.params.id,
        });
      });
};

exports.fetchCollectionByArtist = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Generative.find({
      artists: id,
    })
        .limit(parseInt(number))
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('whitelist', '-__v')
        // .populate("like", "username _id imageUrl slug")
        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }
          if (err) reject(err);
          else {
            resolve(generative);
          }
        });
  });
  return promise;
};

// set generative on sale
exports.setCollectionOnSale = (req, res) => {
  const id = req.params.id;
  const onSale = req.body.onSale;

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }

        // check if generative.artists array contains userId
        if (!generative.artists.includes(req.userId)) {
          return res.status(401).send({
            message: 'Unauthorized',
          });
        }

        generative.onSale = onSale;

        generative.save()
            .then((generative) => {
              res.send({
                id: generative._id,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error Editing Generative',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + req.params.id,
        });
      });
};

// edit generative description
exports.editCollectionDescription = (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }

        // check if generative.artists array contains userId
        if (!generative.artists.includes(userId)) {
          return res.status(401).send({
            message: 'Unauthorized',
          });
        }

        generative.description = req.body.description;

        generative.save()

            .then((generative) => {
              res.send({
                id: generative._id,
                description: generative.description,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error Editing Generative',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + req.params.id,
        });
      });
};

// update price, totalSupply and royalty
exports.updateCollection = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }

        // check if generative.artists array contains userId
        if (!generative.artists.includes(userId) && !isAdmin) {
          return res.status(401).send({
            message: 'Unauthorized',
          });
        }

        if ((generative.supply > 0 &&
          req.body.totalSupply > generative.totalSupply) ||
          req.body.totalSupply < generative.supply) {
          return res.status(404).send({
            message: 'Total supply cannot be greater than ' +
              generative.totalSupply,
          });
        }

        generative.onSale = req.body.onSale;
        generative.price = req.body.price;
        generative.totalSupply = req.body.totalSupply;
        generative.royalty = req.body.royalty;

        generative.save()
            .then((generative) => {
              res.send({
                id: generative._id,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error Editing Generative',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + req.params.id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + req.params.id,
        });
      });
};

exports.updateCollectionWhitelist = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  const whitelisted = req.body.whitelisted;
  const whitelistIds = [];

  for (const wh of whitelisted) {
    const value = Math.floor(wh.value * Math.pow(10, 8));

    const whitelist = new Whitelist({
      address: wh.address,
      value: value,
    });
    await whitelist.save();

    whitelistIds.push(whitelist._id);
  }

  Generative.findById(id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }


        // check if generative.artists array contains userId
        if (!generative.artists.includes(userId) && !isAdmin) {
          return res.status(401).send({
            message: 'Unauthorized',
          });
        }

        generative.whitelist = whitelistIds;

        generative.save()
            .then((generative) => {
              res.send({
                id: generative._id,
              });
            }).catch((err) => {
              res.status(500).send({
                message: err.message || 'Error Editing Whitelist',
              });
            });
      }).catch((err) => {
        if (err.kind === 'ObjectId') {
          return res.status(404).send({
            message: 'Generative not found id ' + id,
          });
        }
        return res.status(500).send({
          message: 'Generative not update id ' + id,
        });
      });
};

const userIsAdmin = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    return false;
  }

  const roles = await Role.find({_id: {$in: user.role}});

  for (const role of roles) {
    if (role.name === 'admin') {
      return true;
    }
  }
  return false;
};

// delete generative whitelist by address
/*
  exports.removeWhitelistAddress = async (req, res) => {
    const userId = req.userId;
    const id = req.params.id;

    const user = await User.findById(userId);

    const address = user.ordinalAddress;

    const generative = await Generative.findById(id)
        .populate('whitelist', '-__v');

    if (!generative) {
      return res.status(404).send({
        message: 'Generative not found id ' + id,
      });
    }

    const whitelist = generative.whitelist.find((wh) => wh.address === address);

    if (!whitelist) {
      return res.status(404).send({
        message: 'Address not found',
      });
    }

    const index =
    generative.whitelist.findIndex((wh) => wh.address === address);

    if (index > -1) {
      generative.whitelist.splice(index, 1);
    }

    await generative.save();

    // remove whitelist generative object
    await Whitelist.findByIdAndRemove(whitelist._id);

    res.send({
      id: generative._id,
      address: address,
    });
  };
  */

exports.likeCollection = (req, res) => {
  Generative.findById(req.params.id)
      .then((generative) => {
        if (!generative) {
          return res.status(404).send({
            message: 'Generative not found',
          });
        }

        const like = generative.like;
        let likes = generative.likes;
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

        generative.like = like;
        generative.likes = likes;
        generative.rank += 5;
        generative.save();

        res.send({
          id: generative._id,
          like: generative.like,
          likes: generative.likes,
        });

        // res.send({});
      }).catch((err) => {
        return res.status(500).send({
          message: 'Error liking Generative',
        });
      });
};

// total number of collections
exports.numberOfCollections = async (req, res) => {
  const collectionsCount = await Generative.countDocuments();

  return collectionsCount;
};

exports.numberOfLikedCollections = async (req, res) => {
  const id = req.params.id;

  const collectionsCount = await Generative.countDocuments({
    like: id,
  });

  return collectionsCount;
};

// collections liked by user
exports.fetchLikedCollections = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Generative.find({
      like: id,
    })
        .limit(parseInt(number))
        .populate('artists', 'username _id imageUrl slug')
        .populate('category', '-__v')
        .populate('whitelist', '-__v')
        // .populate("like", "username _id imageUrl slug")
        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }
          if (err) reject(err);
          else {
            resolve(generative);
          }
        });
  });
  return promise;
};

// fetch highest volume collections
exports.fetchHighestVolumeCollections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Generative.find({})
        .sort({supply: -1, price: -1})
        .limit(6)
        .populate('artists', 'username _id imageUrl slug')
        // .populate('category', '-__v')
        .exec((err, generative) => {
          if (!generative) {
            return resolve([]);
          }

          const collectionArray = [];

          for (const coll of generative) {
            // const volume = coll.supply * coll.price;
            collectionArray.push({
              id: coll._id,
              name: coll.name,
              slug: coll.slug,
              artists: coll.artists,
              supply: coll.supply,
              totalSupply: coll.totalSupply,
              price: coll.price,
              image: coll.image,
              date: coll.date,
              volume: coll.volume,
              like: coll.like,
              likes: coll.likes,
            });
          }

          collectionArray.sort((a, b) => {
            return b.volume - a.volume;
          });
          if (err) reject(err);
          else {
            resolve(collectionArray);
          }
        });
  });
  return promise;
};

exports.getWhitelisSpots = async (req, res) => {
  const collections = await Generative.find({})
      .populate('whitelist', '-__v');

  const whitelistSpots = [];

  for (const coll of collections) {
    for (const wh of coll.whitelist) {
      whitelistSpots.push({
        id: wh._id,
        name: coll.name,
        address: wh.address,
        value: wh.value,
        used: wh.used,
        paid: wh.paid,
      });
    }
  }

  res.status(200).send({
    whitelist: whitelistSpots,
  });
};

exports.setWhitelistSpotUsed = async (req, res) => {
  const id = req.params.id;
  const whitelist = await Whitelist.findById(id);

  if (!whitelist) {
    return res.status(404).send({
      message: 'Whitelist not found id ' + id,
    });
  }

  whitelist.used = !whitelist.used;

  await whitelist.save();

  res.status(200).send({
    id: id,
    message: 'Whitelist spot used',
  });
};

exports.setWhitelistSpotPaid = async (req, res) => {
  const id = req.params.id;
  const whitelist = await Whitelist.findById(id);

  if (!whitelist) {
    return res.status(404).send({
      message: 'Whitelist not found id ' + id,
    });
  }

  whitelist.paid = !whitelist.paid;

  await whitelist.save();

  res.status(200).send({
    id: id,
    message: 'Whitelist spot paid',
  });
};

exports.numberOfCollectionsPerArstistId = async (req, res) => {
  const id = req.params.id;

  const collectionsNumber = await Generative.countDocuments({
    artists: id,
  });

  return collectionsNumber;
};

// percentage of ownership per generative id
exports.percentageOfOwnership = async (req, res) => {
  const id = req.params.id;

  const inscriptions = await Inscription.find({
    collectionRef: id,
  })
      .populate('ordinal', '-__v');

  const owners = [];

  for (const insc of inscriptions) {
    if (!owners.includes(insc.ordinal.address)) {
      owners.push(insc.ordinal.address);
    }
  }

  const percentage = (owners.length / inscriptions.length) * 100;

  res.status(200).send({
    percentage: percentage,
  });
};

// get volume per generative id
exports.volumeOfCollection = async (req, res) => {
  const id = req.params.id;

  const generative = await Generative.findById(id);

  const volume = generative.supply * generative.price;

  res.status(200).send({
    volume: volume,
  });
};

// generate slug for each collections from name
/*
exports.generateSlug = async (req, res) => {
  const collections = await Generative.find({});

  for (const coll of collections) {
    // lowercase name and replace spaces with -
    const slug = coll.name.toLowerCase().replace(/ /g, '-');

    coll.slug = slug;
    await coll.save();
  }

  res.status(200).send({
    message: 'Slug generated',
  });
};
*/

// update the number of inscription.ordinal.onSale = true
// for each generative field generative.onSaleInscriptions
/*
exports.updateOnSaleInscriptions = async (req, res) => {
  const collections = await Generative.find({});

  let number = 0;

  for (const coll of collections) {
    const inscriptions = await Inscription.find({
      collectionRef: coll._id,
    })
        .populate('ordinal', '-__v');

    const onSaleInscriptions =
    inscriptions.filter((insc) => insc.ordinal.onSale === true);

    coll.onSaleInscriptions = onSaleInscriptions.length;
    await coll.save();

    number += onSaleInscriptions.length;
  }

  res.status(200).send({
    message: `${number} on sale inscriptions`,
  });
};
*/

/*
exports.updateCollectionImageLink = async (req, res) => {
  const collections = await Generative.find({});

  for (const coll of collections) {
    const sketch = Sketch.findById(coll.sketch);
    if (!sketch) {
      continue;
    }
    const url = sketch.url.replace('api/generative/', 'storage/generative/');
    if (coll.image === url) {
      continue;
    }
    sketch.url = url;
    await sketch.save();
  }

  res.status(200).send({
    message: 'Generative image link updated',
  });
};
*/

exports.updateCollectionSketchUrl = async (req, res) => {
  const collections = await Generative.find({});

  for (const coll of collections) {
    const sketch = await Sketch.findById(coll.sketch);
    if (!sketch) {
      continue;
    }
    const url =
    sketch.url.replace('storage/generative/', '/storage/generative/');

    sketch.url = url;
    await sketch.save();
  }

  res.status(200).send({
    message: 'Generative sketch updated',
  });
};

/*
exports.deleteCollectionInscriptions = async (req, res) => {
  const collectionId = req.body.id;

  const generative = await Generative.findById(collectionId);

  const inscriptions = await Inscription.find({collectionRef: collectionId});

  Inscription.deleteMany({collectionRef: id})
      .then((data) => {
        console.log(data);
      }).catch((err) => {
        console.log(err);
      });

  inscriptions.forEach(async (element) => {
    const ordinal = await Ordinal.findById(element.ordinal);
    // delete ordinal
    ordinal.remove()
        .then((data) => {
          console.log(data);
        }).catch((err) => {
          console.log(err);
        });
  });

  generative.inscriptions = [];
  generative.supply = 0;
  await generative.save();

  res.status(200).send({
    message: 'Inscriptions deleted',
  });
};
*/
