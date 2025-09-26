const Portfolio = require("../models/portfolio.model");
const Tag = require("../models/tag.model");
const Media = require("../models/media.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");
const Scope = require("../models/scope.model");
const Role = require("../models/role.model");
const mail = require("../middlewares/mail");
// const discord = require('../middlewares/discord');
require("dotenv").config();

const OWNER_EMAIL = process.env.OWNER_EMAIL;

// slug to portfolio id
exports.slugToId = async (req, res) => {
  const slug = req.params.slug;

  const portfolio = await Portfolio.findOne({ slug: slug });

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found",
    });
  }

  res.send({
    id: portfolio._id,
  });
};

// get all portfolio name and id
exports.fetchPortfolioName = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({}, "name slug").exec((err, portfolios) => {
      if (!portfolios) {
        return resolve([]);
      }

      const portfoliosObj = [];

      for (const portfolio of portfolios) {
        portfoliosObj.push({
          id: portfolio._id,
          name: portfolio.name,
          slug: portfolio.slug,
        });
      }

      if (err) reject(err);
      else {
        resolve(portfoliosObj);
      }
    });
  });
  return promise;
};

exports.fetchPortfolios = (req, res) => {
  // const page = req.params.page;
  const sort = parseInt(req.query.sort);

  let sorting = { date: -1 };
  if (sort === 0) {
    sorting = { date: -1 };
  } else if (sort === 1) {
    sorting = { onSale: -1 };
  } else if (sort === 2) {
    sorting = { price: 1 };
  } else if (sort === 3) {
    sorting = { price: -1 };
  }

  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
      .sort(sorting)
      // .skip((page - 1) * 10)
      // .limit(10)
      .populate("authors", "username _id imageUrl slug")
      .populate("medias", "_id url ratio type")
      .populate("tag", "-__v")
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")
      .exec((err, portfolios) => {
        if (!portfolios) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of portfolios) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            subtitle: coll.subtitle,
            description: coll.description,
            authors: coll.authors,
            medias: coll.medias,
            tag: coll.tag,
            display: coll.display,
            likes: coll.likes,
            rank: coll.rank,
            date: coll.date,
            lastModified: coll.lastModified,
            reviewed: coll.reviewed,
            published: coll.published,
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

exports.getAllPortfolios = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
      .populate("authors", "username _id imageUrl slug")
      .exec((err, portfolios) => {
        if (!portfolios) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of portfolios) {
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

exports.fetchAllPortfoliosByNumber = (req, res) => {
  const number = parseInt(req.params.number);

  const sort = parseInt(req.query.sort);

  let sorting = { date: -1 };
  if (sort === 0) {
    sorting = { date: -1 };
  } else if (sort === 1) {
    sorting = { onSale: -1 };
  } else if (sort === 2) {
    sorting = { price: 1 };
  } else if (sort === 3) {
    sorting = { price: -1 };
  }

  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
      .sort(sorting)
      .limit(number)
      .populate("authors", "username _id imageUrl slug")
      .populate("tag", "-__v")
      .populate("medias", "_id url ratio type")
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")
      .exec((err, portfolios) => {
        if (!portfolios) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of portfolios) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
            authors: coll.authors,
            tag: coll.tag,
            // captureDelay: coll.captureDelay,

            medias: coll.medias,
            likes: coll.likes,
            date: coll.date,
            reviewed: coll.reviewed,
            published: coll.published,
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

exports.fetchAllMedias = async (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Media.find({}).exec((err, medias) => {
      resolve(medias);
      if (err) reject(err);
    });
  });
  return promise;
};

exports.fetchGalleryPortfolios = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
      .populate("authors", "username _id imageUrl slug")
      .populate("tag", "-__v")

      .exec((err, portfolios) => {
        if (err) reject(err);
        else {
          resolve(portfolios);
        }
      });
  });
  return promise;
};

exports.fetchPortfolioById = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Portfolio.findById(id)
      .populate("authors", "username _id imageUrl slug")
      .populate("tag", "-__v")
      .populate("medias", "_id url ratio type")
      .populate("like", "username _id imageUrl slug")
      .populate({
        path: "scopes",
        populate: {
            path: "medias",
            select: "_id url ratio type",
        },
        select: "_id title content medias",
      })
      .populate({
        path: "comment",
        populate: {
          path: "authors",
          select: "username _id imageUrl slug",
        },
        select: "_id content authors date",
      })

      .exec((err, portfolio) => {
        if (!portfolio) {
          return resolve({});
        }

        const description = portfolio._doc.description;
        // .replace(/\\n/g, '\n');

        const data = {
          id: portfolio._doc._id,
          name: portfolio._doc.name,
          slug: portfolio._doc.slug,
          subtitle: portfolio._doc.subtitle,
          description: description,
          medias: portfolio._doc.medias,
          authors: portfolio._doc.authors,
          display: portfolio._doc.display,
          scopes: portfolio._doc.scopes,
          views: portfolio._doc.views,
          like: portfolio._doc.like,
          likes: portfolio._doc.likes,
          comment: portfolio._doc.comment,
          date: portfolio._doc.date,
          lastModified: portfolio._doc.lastModified,
          reviewed: portfolio._doc.reviewed,
          published: portfolio._doc.published,
          tag: portfolio._doc.tag,
          links: portfolio._doc.links,
          references: portfolio._doc.references,
        };
        if (err) reject(err);
        else {
         
          resolve(data);
        }
      });
  });
  return promise;
};

// fetch random portfolios using aggregate
exports.fetchRandomPortfolio = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.aggregate([
      { $sample: { size: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "authors",
          foreignField: "_id",
          as: "authors",
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
    ]).exec((err, portfolios) => {
      if (!portfolios) {
        return resolve({});
      }

      const data = {
        id: portfolios[0]._id,
        name: portfolios[0].name,
        slug: portfolios[0].slug,
        description: portfolios[0].description,
        image: portfolios[0].image,
        authors: portfolios[0].authors,
        supply: portfolios[0].supply,
        totalSupply: portfolios[0].totalSupply,
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
exports.fetchRandomPortfolio = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
        .populate('authors', 'username _id imageUrl slug')
        // .populate('tag', '-__v')
    // .populate('sketch', '_id hash url sizeBytes')
    // .populate("like", "username _id imageUrl slug")
        .exec((err, portfolios) => {
          if (!portfolios) {
            return resolve({});
          }

          const random = Math.floor(Math.random() * portfolios.length) || 0;

          const data = {
            id: portfolios[random]._doc._id,
            name: portfolios[random]._doc.name,
            slug: portfolios[random]._doc.slug,
            description: portfolios[random]._doc.description,
            image: portfolios[random]._doc.image,
            // sketch: portfolios[random]._doc.sketch,
            // inscriptions: portfolios[random]._doc.inscriptions,
            authors: portfolios[random]._doc.authors,
            // captureDelay: portfolios[random]._doc.captureDelay,
            // onSale: portfolios[random]._doc.onSale,
            // views: portfolios[random]._doc.views,
            // rank: portfolios[random]._doc.rank,
            // like: portfolios[random]._doc.like,
            // likes: portfolios[random]._doc.likes,
            supply: portfolios[random]._doc.supply,
            totalSupply: portfolios[random]._doc.totalSupply,
            // price: portfolios[random]._doc.price,
            // royalty: portfolios[random]._doc.royalty,
            // volume: portfolios[random]._doc.volume,
            // date: portfolios[random]._doc.date,
            // tag: portfolios[random]._doc.tag,
            // link: portfolios[random]._doc.link,
          };

          resolve(data);

          if (err) reject(err);
        });
  });

  return promise;
};
*/

exports.createPortfolio = async (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const userId = req.userId;

  const user = await User.findById(userId);

  const medias = req.body.medias;
  const mediaIds = [];

  for (const media of medias) {
    const _medias = new Media({
      url: media.url,
      width: media.width,
      height: media.height,
      ratio: media.ratio,
      type: media.type,
      origin: 'portfolio'
    });

    await _medias.save();
    mediaIds.push(_medias._id);
  }

  const slug = req.body.name.toLowerCase().replace(/ /g, "-");

  const portfolio = new Portfolio({
    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    authors: [userId, ...req.body.collabs],
    scopes: req.body.scopes,
    display: req.body.display,
    links: req.body.links,
    references: req.body.references,
    medias: mediaIds,
  });

  await portfolio.save();

  const tagArray = req.body.tag;

  const tagPromises = tagArray.map(async (tg) => {
    const element = await Tag.findOne({
      name: tg,
    });

    if (!element) {
      const tag = new Tag({
        name: tg,
      });

      await tag
        .save()
        .then((data) => {
          portfolio.tag.push(data._id);
        })
        .catch((err) => {
          console.log(err);
        });
    }
    if (element) {
      portfolio.tag.push(element._id);
    }
  });

  await Promise.all(tagPromises);
  await portfolio.save();

  res.send({
    id: portfolio._id,
    slug: portfolio.slug,
  });

  // sendMail(OWNER_EMAIL, portfolio, "description");
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

exports.createTag = async (req, res) => {
  if (!req.body.name) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const tag = new Tag({
    name: req.body.name,
  });

  await tag.save();

  res.status(200).send({
    _id: tag._id,
    name: tag.name,
  });
};

exports.fetchTag = () => {
  const promise = new Promise((resolve, reject) => {
    Tag.find({}).exec((err, categories) => {
      resolve(categories);
      if (err) reject(err);
    });
  });
  return promise;
};

// delete tag by id
exports.deleteTag = (req, res) => {
  const id = req.params.id;

  Tag.findByIdAndRemove(id)
    .then((tag) => {
      if (!tag) {
        return res.status(404).send({
          message: "Tag not found id " + id,
        });
      } else {
        res.send({
          id: tag._id,
          message: "Tag deleted successfully!",
        });
      }
    })
    .catch((err) => {
      if (err.kind === "ObjectId" || err.name === "NotFound") {
        return res.status(404).send({
          message: "Tag not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Could not delete tag id " + id,
      });
    });
};

// set portfolio views
exports.setViews = (req, res) => {
  const id = req.params.id;

  Portfolio.findById(id)
    .then((portfolio) => {
      if (!portfolio) {
        return res.status(404).send({
          message: "Portfolio not found id " + id,
        });
      }

      portfolio.views = portfolio.views + 1;

      portfolio
        .save()
        .then((data) => {
          res.send({
            id: data._id,
            views: data.views,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error updating portfolio",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not update id " + id,
      });
    });
};

// fetch featured portfolios
exports.fetchFeaturedPortfolios = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({ featured: true })
      .populate("authors", "username _id imageUrl slug")
      // .populate('tag', '-__v')
      //  .populate('sketch', '_id hash url sizeBytes')
      // .populate("like", "username _id imageUrl slug")

      .exec((err, portfolio) => {
        if (!portfolio) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of portfolio) {
          collectionObj.push({
            _id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
            //
            authors: coll.authors,
            // tag: coll.tag,
            // captureDelay: coll.captureDelay,
            medias: coll.medias,
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

exports.setFeaturedPortfolios = async (req, res) => {
  // if req.body.featMode === 0, set featured authors randomly
  // if req.body.featMode === 1, set featured authors manually

  const featMode = req.body.featMode;
  const featIds = req.body.featIds;
  console.log(featIds);
  const portfolios = await Portfolio.find({});

  // set all featured to false
  for (const coll of portfolios) {
    coll.featured = false;
    await coll.save();
  }

  if (featMode === 0) {
    // set 3 random portfolios to featured
    for (let i = 0; i < 6; i++) {
      const random = Math.floor(Math.random() * portfolios.length) || 0;
      portfolios[random].featured = true;
      await portfolios[random].save();
    }
  } else if (featMode === 1) {
    // set all authors matching the ids to featured
    for (const coll of portfolios) {
      if (featIds.includes(coll._id.toString())) {
        coll.featured = true;
        await coll.save();
      }
    }
  }

  res.send({ message: "Featured portfolios updated" });
};

// fetch medias of last Portfolio and medias form portfolio.scopes
exports.fetchLastPortfolioMedia = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
      .sort({ date: -1 })
      .limit(1)
      .populate("medias", "_id url ratio type")
      .populate({
        path: "scopes",
        populate: {
          path: "medias",
          select: "_id url ratio type",
        },
      })
      .exec((err, portfolio) => {
        if (err) return reject(err);
        if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
          return resolve([]);
        }

        const first = portfolio[0];
        const scopes = Array.isArray(first.scopes) ? first.scopes : [];
        const mediaScopes = [];
        for (const scope of scopes) {
          const medias = Array.isArray(scope.medias) ? scope.medias : [];
          for (const media of medias) {
            mediaScopes.push(media);
          }
        }

        const _portfolio = {
          id: first._id,
          name: first.name,
          slug: first.slug,
          subtitle: first.subtitle,
          description: first.description,
          authors: first.authors,
          tag: first.tag,
          medias: [...(first.medias || []), ...mediaScopes],
        };

        return resolve(_portfolio);
      });
  });
  return promise;
};


// fetch latest portfolios
exports.fetchLatestPortfolios = (req, res) => {
  const number = parseInt(req.params.number);
    
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({})
      .sort({ date: -1 })
      .limit(number)
      .populate("authors", "username _id imageUrl slug")
      .populate("medias", "url width height ratio type")
      // .populate('whitelist', '-__v')
      .populate('tag', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")

      .exec((err, portfolio) => {
        if (!portfolio) {
          return resolve([]);
        }

        const collectionObj = [];
        for (const coll of portfolio) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            subtitle: coll.subtitle,
            description: coll.description,
            // sketch: coll.sketch,
            authors: coll.authors,
            tag: coll.tag,
            // captureDelay: coll.captureDelay,
            medias: coll.medias,
            // views: coll.views,
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

// fetch latest portfolios by authors

exports.fetchLatestPortfolioByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Portfolio.find({
      authors: id,
    })
      .sort({ date: -1 })
      .limit(4)
      .populate("authors", "username _id imageUrl slug")
      .populate("tag", "-__v")
      // .populate('whitelist', '-__v')
      // .populate("like", "username _id imageUrl slug")
      .exec((err, portfolio) => {
        if (!portfolio) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(portfolio);
        }
      });
  });
  return promise;
};

// check if user is owner of portfolio and delete it
exports.deletePortfolio = (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  Portfolio.findById(id)
    .then((portfolio) => {
      if (!portfolio) {
        return res.status(404).send({
          message: "Portfolio not found id " + id,
        });
      }

      if (!portfolio.authors.includes(userId)) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      if (portfolio.supply > 0) {
        return res.status(404).send({
          message: "Portfolio has supply id: " + id,
        });
      }

      portfolio
        .remove()
        .then((data) => {
          res.send({
            id: id,
            message: "Portfolio deleted successfully id: " + id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error deleting portfolio",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not delete id " + id,
      });
    });
};

// admin delete portfolio

exports.adminDeletePortfolio = async (req, res) => {
  const id = req.params.id;

  Portfolio.findById(id)
    .then((portfolio) => {
      if (!portfolio) {
        return res.status(404).send({
          message: "Portfolio not found id " + id,
        });
      }

      portfolio
        .remove()
        .then((data) => {
          res.send({
            id: id,
            message: "Portfolio deleted successfully id: " + id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error deleting portfolio",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not delete id " + id,
      });
    });
};

// edit portfolio
exports.editPortfolio = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  const collabs = [];

  // check if portfolio.supply is greater than 0 return error
  // and if user is owner of portfolio
  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }
  // check if portfolio.authors array contains userId
  if (!portfolio.authors.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  if (portfolio.supply > 0) {
    return res.status(404).send({
      message: "Portfolio has supply",
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
          message: "Sketch not found id " + sketchId,
        });
      }

      sketch.hash = req.body.sketch.hash;
      sketch.save();
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Sketch not found id " + sketchId,
        });
      }
      return res.status(500).send({
        message: "Sketch not update id " + sketchId,
      });
    });

  const slug = req.body.name.toLowerCase().replace(/ /g, "-");

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

  Portfolio.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      authors: [userId, ...collabs],
      captureDelay: req.body.captureDelay,
      cssSelector: req.body.cssSelector,
      onSale: req.body.onSale,
      totalSupply: req.body.totalSupply,
      price: req.body.price,
      royalty: req.body.royalty,
      link: req.body.link,
      image: req.body.image,
      tag: [],
      sketch: sketchId,
      whitelist: whitelistIds,
      modified: new Date().toISOString(),
    },
    { new: true }
  )
    .then(async (portfolio) => {
      const categoryArray = req.body.tag;

      const categoryPromises = categoryArray.map(async (cat) => {
        const categoryName = portfolio.tag.map(async (element) => {
          const fetchTag = await Tag.findById(element);
          return fetchTag.name;
        });
        if (categoryName.includes(cat)) {
          return;
        }

        const element = await Tag.findOne({
          name: cat,
        });

        if (!element) {
          const tag = new Tag({
            name: cat,
          });

          await tag
            .save()
            .then((data) => {
              portfolio.tag.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        if (element) {
          portfolio.tag.push(element._id);
        }
      });
      await Promise.all(categoryPromises);
      await portfolio.save();

      res.send({
        id: portfolio._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not update id " + req.params.id,
      });
    });
};

exports.editUserPortfolio = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const collabs = [];

  // check if portfolio.supply is greater than 0 return error
  // and if user is owner of portfolio
  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
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
          message: "Sketch not found id " + sketchId,
        });
      }

      sketch.hash = req.body.sketch.hash;
      sketch.save();
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Sketch not found id " + sketchId,
        });
      }
      return res.status(500).send({
        message: "Sketch not update id " + sketchId,
      });
    });

  const slug = req.body.name.toLowerCase().replace(/ /g, "-");

  Portfolio.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      authors: [...collabs],
      captureDelay: req.body.captureDelay,
      cssSelector: req.body.cssSelector,
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
      tag: [],
      sketch: sketchId,
      modified: new Date().toISOString(),
    },
    { new: true }
  )
    .then(async (portfolio) => {
      const categoryArray = req.body.tag;

      const categoryPromises = categoryArray.map(async (cat) => {
        const categoryName = portfolio.tag.map(async (element) => {
          const fetchTag = await Tag.findById(element);
          return fetchTag.name;
        });
        if (categoryName.includes(cat)) {
          return;
        }

        const element = await Tag.findOne({
          name: cat,
        });

        if (!element) {
          const tag = new Tag({
            name: cat,
          });

          await tag
            .save()
            .then((data) => {
              portfolio.tag.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        if (element) {
          portfolio.tag.push(element._id);
        }
      });
      await Promise.all(categoryPromises);
      await portfolio.save();

      res.send({
        id: portfolio._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not update id " + req.params.id,
      });
    });
};

exports.createScope = async (req, res) => {
  if (!req.body.title || !req.body.content) {
    return res.status(400).send({
      message: "Scope Fields cannot be empty",
    });
  }
  //const loggedInUser = loginController.getLoggedInUserObject(req, res);

  const medias = req.body.medias;
  const mediaIds = [];

  for (const media of medias) {
    const _medias = new Media({
      url: media.url,
      width: media.width,
      height: media.height,
      ratio: media.ratio,
      type: media.type,
      origin: 'scope'
    });

    await _medias.save();
    mediaIds.push(_medias._id);
  }

  const scope = new Scope({
    title: req.body.title,
    content: req.body.content,
    medias: mediaIds,
  });
  scope
    .save()
    .then((data) => {
      res.send({
        id: data._id,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Error Scope",
      });
    });
};
// Retrieve and return scope by id from the database.
exports.fetchScope = (req, res) => {
  Scope.findById(req.params.id).exec((err, scope) => {
    const scopeObj = {
      id: scope._id,
      title: scope._doc.title,
      description: scope._doc.description,
      medias: scope._doc.medias,
    };
    res.send(scopeObj);
    if (err) {
      return res.status(500).send({
        message: "Error retrieving scope with id " + req.params.id,
      });
    }
  });
};

// Retrieve and return all sections from article by id from the database.
exports.fetchScopes = (req, res) => {
  Portfolio.findById(req.params.id)
    .populate("scope", "-__v")
    .exec((err, port) => {
      res.send(port.scope);
      if (err) {
        return res.status(500).send({
          message: "Error retrieving scopes with id " + req.params.id,
        });
      }
    });
};

// edit scope
exports.editScope = (req, res) => {
  if (!req.body.title || !req.body.description) {
    return res.status(400).send({
      message: "Scope Fields cannot be empty",
    });
  }

  Scope.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
      description: req.body.description,
      medias: req.body.medias,
    },
    {
      new: true,
    }
  )
    .then((scope) => {
      if (!scope) {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      res.send({
        id: scope._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating scope with id " + req.params.id,
      });
    });
};

exports.editScopeTitle = (req, res) => {
  if (!req.body.title) {
    return res.status(400).send({
      message: "Scope Fields cannot be empty",
    });
  }

  Scope.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
    },
    {
      new: true,
    }
  )
    .then((scope) => {
      if (!scope) {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      res.status(200).send({
        id: scope._id,
        title: scope.title,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating scope with id " + req.params.id,
      });
    });
};

exports.editScopeContent = (req, res) => {
  if (!req.body.content) {
    return res.status(400).send({
      message: "Scope Fields cannot be empty",
    });
  }

  Scope.findByIdAndUpdate(
    req.params.id,
    {
      content: req.body.content,
    },
    {
      new: true,
    }
  )
    .then((scope) => {
      if (!scope) {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      res.status(200).send({
        id: scope._id,
        content: scope.content,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating scope with id " + req.params.id,
      });
    });
};

exports.editScopeImageUrl = (req, res) => {
  if (!req.body.medias) {
    return res.status(400).send({
      message: "Scope Fields cannot be empty",
    });
  }

  Scope.findByIdAndUpdate(
    req.params.id,
    {
      medias: req.body.medias,
    },
    {
      new: true,
    }
  )
    .then((scope) => {
      if (!scope) {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      res.status(200).send({
        id: scope._id,
        medias: scope.medias,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Scope not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating scope with id " + req.params.id,
      });
    });
};

// fetch portfolios by artist id
exports.fetchPortfolioByArtistId = (req, res) => {
    const id = req.userId;

    const promise = new Promise((resolve, reject) => {
        Portfolio.find({
            authors: id,    
        })
            .populate('authors', 'username _id imageUrl slug')
            .populate('tag', '-__v')
            .populate('like', 'username _id imageUrl slug')
            .populate('medias', 'url width height ratio type')
            .exec((err, portfolio) => {
                if (!portfolio) {
                    return resolve([]);
                }
                if (err) reject(err);
                else {

                    const portfolioObj = [];
                    for (const coll of portfolio) {
                        portfolioObj.push({
                            id: coll._id,
                            name: coll.name,
                            slug: coll.slug,
                            subtitle: coll.subtitle,
                            description: coll.description,
                            medias: coll.medias,
                            authors: coll.authors,
                            display: coll.display,
                            scopes: coll.scopes,
                            views: coll.views,
                            like: coll.like,
                            likes: coll.likes,
                            comment: coll.comment,
                            date: coll.date,
                            lastModified: coll.lastModified,
                            reviewed: coll.reviewed,
                            published: coll.published,
                            tag: coll.tag,
                            links: coll.links,
                            references: coll.references,
                        });
                    }
                    resolve(portfolioObj);
                }
            });
    });
    return promise;
};

// fetch portfolio by id by artist id
exports.fetchPortfolioByIdByArtistId = (req, res) => {
    const id = req.params.id;
    const userId = req.userId;

    const promise = new Promise((resolve, reject) => {
        Portfolio.findOne({
            _id: id,
            authors: userId,
        })
            .populate('authors', 'username _id imageUrl slug')
            .populate('tag', '-__v')
            .populate('like', 'username _id imageUrl slug')
            .populate('medias', 'url width height ratio type')
            .populate({
                path: "scopes",
                populate: {
                    path: "medias",
                    select: "_id url ratio type",
                },
                select: "_id title content medias",
              })
              .populate({
                path: "comment",
                populate: {
                  path: "authors",
                  select: "username _id imageUrl slug",
                },
                select: "_id content authors date",
              })
              .exec((err, portfolio) => {
                if (!portfolio) {
                  return resolve({});
                }

                console.log(portfolio);
        
                const data = {
                  id: portfolio._doc._id,
                  name: portfolio._doc.name,
                  slug: portfolio._doc.slug,
                  subtitle: portfolio._doc.subtitle,
                  description: portfolio._doc.description,
                  medias: portfolio._doc.medias,
                  authors: portfolio._doc.authors,
                  display: portfolio._doc.display,
                  scopes: portfolio._doc.scopes,
                  views: portfolio._doc.views,
                  like: portfolio._doc.like,
                  likes: portfolio._doc.likes,
                  comment: portfolio._doc.comment,
                  date: portfolio._doc.date,
                  lastModified: portfolio._doc.lastModified,
                  reviewed: portfolio._doc.reviewed,
                  published: portfolio._doc.published,
                  tag: portfolio._doc.tag,
                  links: portfolio._doc.links,
                  references: portfolio._doc.references,
                };
                if (err) reject(err);
                else {
                
                  resolve(data);
                }
              });
    });
    return promise;
};

exports.fetchPortfolioByArtist = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Portfolio.find({
      authors: id,
    })
      .limit(parseInt(number))
      .populate("authors", "username _id imageUrl slug")
      .populate("tag", "-__v")
      .populate("like", "username _id imageUrl slug")
      .populate("medias", "url width height ratio type")
      .exec((err, portfolio) => {
        if (!portfolio) {
          return resolve([]);
        }
        if (err) reject(err);
        else {

            const portfolioObj = [];
            for (const coll of portfolio) {
                portfolioObj.push({
                    id: coll._id,
                    name: coll.name,
                    slug: coll.slug,
                    subtitle: coll.subtitle,
                    description: coll.description,
                    medias: coll.medias,
                    authors: coll.authors,
                    display: coll.display,
                    scopes: coll.scopes,
                    views: coll.views,
                    like: coll.like,
                    likes: coll.likes,
                    comment: coll.comment,
                    date: coll.date,
                    lastModified: coll.lastModified,
                    reviewed: coll.reviewed,
                    published: coll.published,
                    tag: coll.tag,
                    links: coll.links,
                    references: coll.references,
                });
            }
          resolve(portfolioObj);
        }
      });
  });
  return promise;
};

// set portfolio on display
exports.setPortfolioOnDisplay = async (req, res) => {
  const id = req.params.id;

  const isAdmin = await userIsAdmin(req.userId);

  Portfolio.findById(id)
    .then((portfolio) => {
      if (!portfolio) {
        return res.status(404).send({
          message: "Portfolio not found id " + req.params.id,
        });
      }

      // check if portfolio.authors array contains userId
      if (!portfolio.authors.includes(req.userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      portfolio.display = !portfolio.display;

      portfolio
        .save()
        .then((portfolio) => {
          res.send({
            id: portfolio._id,
            display: portfolio.display,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Portfolio",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not update id " + req.params.id,
      });
    });
};

exports.commentPortfolio = async (req, res) => {
  const _id = req.params.id;
  const userId = req.userId;
  const user = await User.findById(userId);

  const comment = new Comment({
    content: req.body.comment,
    authors: userId,
  });
  comment
    .save()
    .then((data) => {
      addComment(data._id);
      res.send({
        id: data._id,
        serieId: _id,
        username: user.username,
        imageUrl: user.imageUrl,
        content: data.content,
        authors: data.authors,
        date: data.date,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Error creating comment",
      });
    });

  const addComment = (id) => {
    Portfolio.findById(_id)
      .then((_serie) => {
        if (!_serie) {
          return res.status(404).send({
            message: "Portfolio not found",
          });
        }
        _serie.comments.push(id);
        _serie.save();

        // res.send({});
      })
      .catch((err) => {
        return res.status(500).send({
          message: "Error saving comment",
        });
      });
  };
};

exports.removeComment = async (req, res) => {
  const commentId = req.params.id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return res.status(404).send({
      message: "Comment not found id " + commentId,
    });
  }

  const portfolio = await Portfolio.findOne({ comments: commentId });

  if (!portfolio) {
    return res.status(404).send({
      message: "No comment found in portfolio",
    });
  }

  const index = portfolio.comments.indexOf(commentId);

  if (index > -1) {
    portfolio.comments.splice(index, 1);
  }

  await portfolio.save();

  // delete comment
  await Comment.findByIdAndDelete(commentId);

  res.status(200).send({
    id: commentId,
    serieId: portfolio._id,
  });
};

// edit portfolio description
exports.editPortfolioDescription = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const isAdmin = await userIsAdmin(userId);

  Portfolio.findById(id)
    .then((portfolio) => {
      if (!portfolio) {
        return res.status(404).send({
          message: "Portfolio not found id " + req.params.id,
        });
      }

      // check if portfolio.authors array contains userId
      if (!portfolio.authors.includes(userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      portfolio.description = req.body.description;

      portfolio
        .save()

        .then((portfolio) => {
          res.send({
            id: portfolio._id,
            description: portfolio.description,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Portfolio",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Portfolio not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Portfolio not update id " + req.params.id,
      });
    });
};

// edit portfolio name
exports.editPortfolioName = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const name = req.body.name;

  const slug = name.toLowerCase().replace(/ /g, "-");

  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if portfolio.authors array contains userId
  if (!portfolio.authors.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  // check that  the supply is 0
  if (portfolio.supply > 0) {
    return res.status(404).send({
      message: "Portfolio has supply",
    });
  }

  portfolio.name = name;
  portfolio.slug = slug;

  await portfolio.save();

  res.status(200).send({
    id: portfolio._id,
    name: portfolio.name,
    slug: portfolio.slug,
  });
};

// edit portfolio subtitle
exports.editPortfolioSubtitle = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if portfolio.authors array contains userId
  if (!portfolio.authors.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  portfolio.subtitle = req.body.subtitle;

  await portfolio.save();

  res.status(200).send({
    id: portfolio._id,
    subtitle: portfolio.subtitle,
  });
};

// update portfolio tag
exports.updatePortfolioTag = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if portfolio.authors array contains userId
  if (!portfolio.authors.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }
  const tags = [];
  const tagArray = req.body.tag;
  const newTags = [];

  for (const tag of tagArray) {
    const tagExist = await Tag.findOne({
      name: tag,
    });

    if (!tagExist) {
      const tag = new Tag({
        name: tag,
      });

      await tag.save();
      tags.push(tag._id);
    } else {
      tags.push(tagExist._id);
    }
  }

  portfolio.tag.push(...tags);

  await portfolio.save();

  for (const tag of tags) {
    const fetchTag = await Tag.findById(tag);
    newTags.push(fetchTag);
  }

  res.status(200).send({
    id: portfolio._id,
    tags: newTags,
  });
};

// removePortfolioTag
exports.removePortfolioTag = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if portfolio.authors array contains userId
  if (!portfolio.authors.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const categoryId = req.body.categoryId;

  const categoryIndex = portfolio.tag.indexOf(categoryId);

  if (categoryIndex === -1) {
    return res.status(404).send({
      message: "Tag not found id " + categoryId,
    });
  }

  portfolio.tag.splice(categoryIndex, 1);

  await portfolio.save();

  res.status(200).send({
    id: portfolio._id,
    categoryId: categoryId,
  });
};

exports.toggleReviewPortfolio = async (req, res) => {
  const id = req.params.id;

  const portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }

  portfolio.reviewed = !portfolio.reviewed;

  await portfolio.save();

  res.status(200).send({
    id: portfolio._id,
    reviewed: portfolio.reviewed,
  });
};

const userIsAdmin = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    return false;
  }

  const roles = await Role.find({ _id: { $in: user.role } });

  for (const role of roles) {
    if (role.name === "admin") {
      return true;
    }
  }
  return false;
};

// delete portfolio whitelist by address
/*
  exports.removeWhitelistAddress = async (req, res) => {
    const userId = req.userId;
    const id = req.params.id;

    const user = await User.findById(userId);

    const address = user.ordinalAddress;

    const portfolio = await Portfolio.findById(id)
        .populate('whitelist', '-__v');

    if (!portfolio) {
      return res.status(404).send({
        message: 'Portfolio not found id ' + id,
      });
    }

    const whitelist = portfolio.whitelist.find((wh) => wh.address === address);

    if (!whitelist) {
      return res.status(404).send({
        message: 'Address not found',
      });
    }

    const index =
    portfolio.whitelist.findIndex((wh) => wh.address === address);

    if (index > -1) {
      portfolio.whitelist.splice(index, 1);
    }

    await portfolio.save();

    // remove whitelist portfolio object
    await Whitelist.findByIdAndRemove(whitelist._id);

    res.send({
      id: portfolio._id,
      address: address,
    });
  };
  */
/*
exports.likePortfolio = (req, res) => {
  Portfolio.findById(req.params.id)
    .then((portfolio) => {
      if (!portfolio) {
        return res.status(404).send({
          message: 'Portfolio not found',
        });
      }

      const like = portfolio.like;
      let likes = portfolio.likes;
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

      portfolio.like = like;
      portfolio.likes = likes;
      portfolio.rank += 5;
      portfolio.save();

      res.send({
        id: portfolio._id,
        like: portfolio.like,
        likes: portfolio.likes,
      });

      // res.send({});
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error liking Portfolio',
      });
    });
};
*/

exports.likePortfolio = async (req, res) => {
  const id = req.params.id;
  let portfolio;

  portfolio = await Portfolio.findById(id);

  if (!portfolio) {
    return res.status(404).send({
      message: "Portfolio not found id " + id,
    });
  }

  const like = portfolio.like;
  let likes = portfolio.likes;
  const userId = req.userId;

  if (like.includes(userId)) {
    const index = like.findIndex((user) => user == userId);
    if (index > -1) {
      like.splice(index, 1);
      if (likes > 0) likes -= 1;
    }
  } else {
    like.push(userId);
    likes += 1;
  }

  portfolio.like = like;
  portfolio.likes = likes;
  portfolio.rank += 5;
  await portfolio.save();

  portfolio = await Portfolio.findById(id).populate(
    "like",
    "username _id imageUrl slug"
  );

  res.status(200).send({
    id: portfolio._id,
    like: portfolio.like,
    likes: portfolio.likes,
  });
};

// total number of portfolios
exports.numberOfPortfolios = async (req, res) => {
  const collectionsCount = await Portfolio.countDocuments();

  return collectionsCount;
};

exports.numberOfLikedPortfolios = async (req, res) => {
  const id = req.params.id;

  const collectionsCount = await Portfolio.countDocuments({
    like: id,
  });

  return collectionsCount;
};

// portfolios liked by user
exports.fetchLikedPortfolios = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;
  const promise = new Promise((resolve, reject) => {
    Portfolio.find({
      // look for user id in like array
      like: id,
    })
      .limit(parseInt(number))
      .populate("authors", "username _id imageUrl slug")
      .populate("tag", "-__v")
      .populate("medias", "url width height ratio type")
      // .populate('whitelist', '-__v')
      // .populate("like", "username _id imageUrl slug")
      .exec((err, portfolio) => {
        if (!portfolio) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(portfolio);
        }
      });
  });
  return promise;
};

exports.numberOfPortfoliosPerArstistId = async (req, res) => {
  const id = req.params.id;

  const collectionsNumber = await Portfolio.countDocuments({
    authors: id,
  });

  return collectionsNumber;
};

// percentage of ownership per portfolio id
exports.percentageOfOwnership = async (req, res) => {};

// get volume per portfolio id
exports.volumeOfPortfolio = async (req, res) => {
  const id = req.params.id;

  const portfolio = await Portfolio.findById(id);

  const volume = portfolio.supply * portfolio.price;

  res.status(200).send({
    volume: volume,
  });
};

// generate slug for each portfolios from name
/*
exports.generateSlug = async (req, res) => {
  const portfolios = await Portfolio.find({});

  for (const coll of portfolios) {
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
// for each portfolio field portfolio.onSaleInscriptions
/*
exports.updateOnSaleInscriptions = async (req, res) => {
  const portfolios = await Portfolio.find({});

  let number = 0;

  for (const coll of portfolios) {
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
exports.updatePortfolioImageLink = async (req, res) => {
  const portfolios = await Portfolio.find({});

  for (const coll of portfolios) {
    const sketch = Sketch.findById(coll.sketch);
    if (!sketch) {
      continue;
    }
    const url = sketch.url.replace('api/portfolio/', 'storage/portfolio/');
    if (coll.image === url) {
      continue;
    }
    sketch.url = url;
    await sketch.save();
  }

  res.status(200).send({
    message: 'Portfolio image link updated',
  });
};
*/
