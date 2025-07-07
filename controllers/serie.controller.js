const db = require("../models");
const mail = require("../middlewares/mail");
const parseHtml = require("../middlewares/parseHtml");
const { use } = require("passport");
const { pipeline } = require("form-data");
// const discord = require('../middlewares/discord');
require("dotenv").config();
const Serie = db.serie;
const Whitelist = db.whitelist;
const Trait = db.trait;
const Category = db.category;
const Sketch = db.sketch;
const Media = db.media;
const User = db.user;
const Role = db.role;
const Chain = db.chain;

// slug to serie id
exports.slugToId = async (req, res) => {
  const slug = req.params.slug;

  const serie = await Serie.findOne({ slug: slug });

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found",
    });
  }

  res.send({
    id: serie._id,
  });
};

// get all serie name and id
exports.fetchSerieName = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({}, "name slug").exec((err, series) => {
      if (!series) {
        return resolve([]);
      }

      const seriesObj = [];

      for (const serie of series) {
        seriesObj.push({
          id: serie._id,
          name: serie.name,
          slug: serie.slug,
        });
      }

      if (err) reject(err);
      else {
        resolve(seriesObj);
      }
    });
  });
  return promise;
};

exports.fetchSeries = (req, res) => {
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
    Serie.find({})
      .sort(sorting)
      // .skip((page - 1) * 10)
      // .limit(10)
      .populate("artists", "username _id imageUrl slug")
      .populate("media", "_id url ratio type")
      .populate("category", "-__v")
      .populate("chain", "-__v")
      .populate("category", "-__v")
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")
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
            subtitle: coll.subtitle,
            description: coll.description,
            // sketch: coll.sketch,
            artists: coll.artists,
            // captureDelay: coll.captureDelay,
            supply: coll.supply,
            totalSupply: coll.totalSupply,
            price: coll.price,
            priceUSD: coll.priceUSD,
            royalty: coll.royalty,
            volume: coll.volume,
            // link: coll.link,
            image: coll.image,
            media: coll.media,
            category: coll.category,
            type: coll.type,
            chain: coll.chain,
            display: coll.display,
            onChain: coll.onChain,
            onSale: coll.onSale,
            likes: coll.likes,
            rank: coll.rank,
            date: coll.date,
            modified: coll.modified,
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

exports.getAllSeries = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .populate("artists", "username _id imageUrl slug")
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

exports.fetchAllSeriesByNumber = (req, res) => {
  const number = parseInt(req.params.number);

  const sort = parseInt(req.query.sort);
  let chain = req.query.chain;
  let type = req.query.type;
  const category = req.query.category;

  let cat_exp = {};
  let chain_exp = {};
  let type_exp = {};

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


  if (category !== 'all') {
    // check if array of object serie.categories contains category.name === req.body.category
    cat_exp = { 'category.name': category };
  }
  if (chain !== 'all') {
    chain = chain.toLowerCase();
    chain_exp = { 'chain.name': chain };
  }
  if (type !== 'all') {
    type = type.toLowerCase();
    type_exp = { type: type };
  }

  // use aggregators to fetch collection with category matching req.body.category
  const promise = new Promise((resolve, reject) => {
    Serie.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',

      },
  
      {
        $lookup: {
          from: 'chains',
          localField: 'chain',
          foreignField: '_id',
          as: 'chain',
        },
      },
      
      
      {
        $unwind: '$chain',
      },
      
     
      {
        $match: {
          ...cat_exp,
          ...chain_exp,
          ...type_exp,
        }
      },
      // prevent duplicates
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          slug: { $first: '$slug' },
          description: { $first: '$description' },
          artists: { $first: '$artists' },
          category: { $first: '$category' },
          onSale: { $first: '$onSale' },
          supply: { $first: '$supply' },
          totalSupply: { $first: '$totalSupply' },
          price: { $first: '$price' },
          image: { $first: '$image' },
          media: { $first: '$media' },
          likes: { $first: '$likes' },
          views: { $first: '$views' },
          date: { $first: '$date' },
          reviewed: { $first: '$reviewed' },
          published: { $first: '$published' },
          like: { $first: '$like' },
          whitelist: { $first: '$whitelist' }
        },
      },
   
      {$sort: sorting},
      {$limit: number},
      
      {
        $lookup: {
          from: 'media',
          localField: 'media',
          foreignField: '_id',
          as: 'media',
          pipeline: [
            {
              $project: {
                _id: 1,
                url: 1,
                ratio: 1,
                type: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artists',
          foreignField: '_id',
          as: 'artists',
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                imageUrl: 1,
                slug: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'whitelist',
          localField: 'whitelist',
          foreignField: '_id',
          as: 'whitelist',
        },
      },
      {
        $lookup: {
          from: 'like',
          localField: 'like',
          foreignField: '_id',
          as: 'like',
        },
      }, 
    ]).exec((err, filteredSeries) => {
      if (err) {
        reject(err);
      } else {

        const serieArray = [];

 

        for (const serie of filteredSeries) {
          serieArray.push({
            id: serie._id,
            name: serie.name,
            slug: serie.slug,
            description: serie.description,
            // sketch: serie.sketch,
            artists: serie.artists,
            category: serie.category,
            // captureDelay: serie.captureDelay,
            onSale: serie.onSale,
            supply: serie.supply,
            totalSupply: serie.totalSupply,
            price: serie.price,
            // royalty: serie.royalty,
            // volume: serie.volume,
            // link: serie.link,
            image: serie.image,
            media: serie.media,
            likes: serie.likes,
            views: serie.views,
            date: serie.date,
            reviewed: serie.reviewed,
            published: serie.published,
            // featured: serie.featured,
            like: serie.like,
            whitelist: serie.whitelist,
          });
        }

        resolve(serieArray);
      }
    });
  });
  
  /*
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .sort(sorting)
      .limit(number)
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("media", "_id url ratio type")
      .populate("whitelist", "-__v")
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")
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
            artists: coll.artists,
            category: coll.category,
            // captureDelay: coll.captureDelay,
            onSale: coll.onSale,
            supply: coll.supply,
            totalSupply: coll.totalSupply,
            price: coll.price,
            // royalty: coll.royalty,
            // volume: coll.volume,
            // link: coll.link,
            image: coll.image,
            media: coll.media,
            likes: coll.likes,
            date: coll.date,
            reviewed: coll.reviewed,
            published: coll.published,
            // featured: coll.featured,
            like: coll.like,
            whitelist: coll.whitelist,
          });
        }

        if (err) reject(err);
        else {
          resolve(collectionObj);
        }
      });
  });
  */

  return promise;
};

exports.fetchGallerySeries = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("sketch", "_id hash url sizeBytes")

      .exec((err, collections) => {
        if (err) reject(err);
        else {
          resolve(collections);
        }
      });
  });
  return promise;
};

exports.getSerieETH = async (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Serie.findById(id)
      .populate("artists", "_id address slug username")
      .populate("sketch", "_id html css javascript")
      .populate("media", "_id url ratio type")
      .populate("chain", "-__v")
      .exec((err, serie) => {
        if (!serie) {
          return resolve({});
        }

        const data = {
          id: serie._doc._id,
          name: serie._doc.name,
          slug: serie._doc.slug,
          description: serie._doc.description,
          media: serie._doc.media,
          artists: serie._doc.artists,
          sketch: serie._doc.sketch,
          // onChain: serie._doc.onChain,
          chain: serie._doc.chain,
          // onSale: serie._doc.onSale,
          totalSupply: serie._doc.totalSupply,
          price: serie._doc.price,
          // royalty: serie._doc.royalty,
          // whitelist: serie._doc.whitelist,
        };

        if (err) reject(err);
        else {
          resolve(data);
        }
      });
  });
  return promise;
};

exports.fetchSerieById = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Serie.findById(id)
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("sketch", "_id html css javascript hash url sizeBytes")
      .populate("media", "_id url ratio type")
      .populate("trait", "_id trait_type value")
      .populate("whitelist", "-__v")
      .populate("like", "username _id imageUrl slug")
      .populate("chain", "-__v")
      .exec((err, serie) => {
        if (!serie) {
          return resolve({});
        }

        const description = serie._doc.description;
        // .replace(/\\n/g, '\n');

        const data = {
          id: serie._doc._id,
          name: serie._doc.name,
          slug: serie._doc.slug,
          subtitle: serie._doc.subtitle,
          description: description,
          image: serie._doc.image,
          media: serie._doc.media,
          type: serie._doc.type,
          sketch: serie._doc.sketch,
          artists: serie._doc.artists,
          captureDelay: serie._doc.captureDelay,
          cssSelector: serie._doc.cssSelector,
          backgroundColor: serie._doc.backgroundColor,
          onChain: serie._doc.onChain,
          chain: serie._doc.chain,
          display: serie._doc.display,
          onSale: serie._doc.onSale,
          views: serie._doc.views,
          like: serie._doc.like,
          likes: serie._doc.likes,
          supply: serie._doc.supply,
          totalSupply: serie._doc.totalSupply,
          price: serie._doc.price,
          priceUSD: serie._doc.priceUSD,
          royalty: serie._doc.royalty,
          trait: serie._doc.trait,
          volume: serie._doc.volume,
          date: serie._doc.date,
          modified: serie._doc.modified,
          reviewed: serie._doc.reviewed,
          published: serie._doc.published,
          projectId: serie._doc.projectId,
          category: serie._doc.category,
          link: serie._doc.link,
          whitelist: serie._doc.whitelist,
          generative: serie._doc.generative,
          interactive: serie._doc.interactive,
          audioBased: serie._doc.audioBased
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
exports.fetchRandomSerie = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.aggregate([
      { $sample: { size: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "artists",
          foreignField: "_id",
          as: "artists",
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
    ]).exec((err, collections) => {
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
exports.fetchRandomSerie = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
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
    html: htmlContent,
    url: fileUrl,
    hash: "",
    sizeBytes: sizeBytes,
  });

  await sketch.save();
  res.status(200).send({
    id: sketch._id,
  });
};

// assignSketchUrl
exports.assignSketchUrl = async (req, res) => {
  const id = req.body.id;

  const url = req.body.fileUrl;

  const sketch = await Sketch.findById(id);

  if (!sketch) {
    return res.status(404).send({
      message: "Sketch not found id " + id,
    });
  }

  sketch.url = url;

  await sketch.save();

  res.status(200).send({
    id: sketch._id,
    url: sketch.url,
  });
};

exports.parseHtml = async (req, res) => {
  const htmlContent = req.body.htmlContent;
  const fileUrl = req.body.fileUrl;

  const { html, css, js } = await parseHtml(htmlContent);

  const sketch = new Sketch({
    html: html,
    css: css,
    javascript: js,
    url: fileUrl,
  });

  await sketch.save();

  res.status(200).send({
    id: sketch._id,
  });
};

exports.createSerie = async (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const serieType = req.body.type;
  const chainType = req.body.chain;

  const userId = req.userId;

  const user = await User.findById(userId);

  let chain = await Chain.findOne({ name: chainType });

  if (!chain) {
    chain = new Chain({
      name: chainType,
      address: user.address,
    });
    await chain.save();
  }

  const chainId = chain._id;

  const media = new Media({
    url: req.body.media.url,
    width: req.body.media.width,
    height: req.body.media.height,
    ratio: req.body.media.ratio,
    type: req.body.media.type,
    origin: 'serie'
  });

  await media.save();

  const traits = [];

  const traitArray = req.body.traits;

  for (const trait of traitArray) {
    const newTrait = new Trait({
      trait_type: trait.trait_type,
      value: trait.value,
    });

    await newTrait.save();
    traits.push(newTrait._id);
  }

  if (serieType === "generative") {
    const sketchId = req.body.sketch.id;

    // get sketch by id
    Sketch.findById(sketchId)
      .then((sketch) => {
        if (!sketch) {
          return res.status(404).send({
            message: "Sketch not found id " + sketchId,
          });
        } else {
          sketch.hash = req.body.sketch.hash;
          return sketch.save();
        }
      })
      .then(async (sketch) => {
        const slug = req.body.name.toLowerCase().replace(/ /g, "-");

        const whitelistIds = await Promise.all(
          req.body.whitelisted.map(async (wh) => {
            const newWhitelist = new Whitelist({
              chain: chainId,
              address: wh.address,
              value: Math.floor(wh.value * Math.pow(10, 8)),
              spot: wh.spot,
            });
            const savedWhitelist = await newWhitelist.save();
            return savedWhitelist._id;
          })
        );

        new Serie({
          name: req.body.name,
          slug: slug,
          subtitle: req.body.subtitle,
          description: req.body.description,
          type: req.body.type,
          sketch: sketch._id,
          artists: [userId, ...req.body.collabs],
          captureDelay: req.body.captureDelay,
          cssSelector: req.body.cssSelector || "body",
          backgroundColor: req.body.backgroundColor || "#F2F0EC",
          onChain: req.body.onChain,
          chain: chainId,
          onSale: req.body.onSale,
          display: req.body.display,
          totalSupply: req.body.totalSupply,
          price: req.body.price,
          priceUSD: req.body.priceUSD,
          royalty: req.body.royalty,
          link: req.body.link,
          image: req.body.image,
          media: media._id,
          whitelist: whitelistIds,
          trait: traits,
          generative: req.body.generative,
          interactive: req.body.interactive,
          audioBased: req.body.audioBased,
        })
          .save()
          .then(async (serie) => {
            const categoryArray = req.body.category;

            const categoryPromises = categoryArray.map(async (cat) => {
              const element = await Category.findOne({
                name: cat,
              });

              if (!element) {
                const category = new Category({
                  name: cat,
                });

                await category
                  .save()
                  .then((data) => {
                    serie.category.push(data._id);
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              }
              if (element) {
                serie.category.push(element._id);
              }
            });

            await Promise.all(categoryPromises);
            await serie.save();

            res.send({
              id: serie._id,
              slug: serie.slug,
              chain: chain,
              type: serie.type
            });
            /*
            const emailTo = user.email || 'pmosi76@gmail.com';

            sendMail(emailTo, serie, 'content');

            const title = `New Serie Created | ${serie.name}`;
            const content = `${serie.name} by ${serie.artists[0]}`;

            discord.sendNotification(title, content, serie.image);
            */
          })
          .catch((err) => {
            res.status(500).send({
              message: err.message || "Error Creating Serie",
            });
          });
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
  } else if (serieType === "mixmedia") {
    const slug = req.body.name.toLowerCase().replace(/ /g, "-");

    const whitelistIds = await Promise.all(
      req.body.whitelisted.map(async (wh) => {
        const newWhitelist = new Whitelist({
          chain: chainId,
          address: wh.address,
          value: Math.floor(wh.value * Math.pow(10, 8)),
          spot: wh.spot,
        });
        const savedWhitelist = await newWhitelist.save();
        return savedWhitelist._id;
      })
    );

    const serie = new Serie({
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      type: req.body.type,
      artists: [userId, ...req.body.collabs],
      onChain: req.body.onChain,
      chain: chainId,
      display: req.body.display,
      onSale: req.body.onSale,
      totalSupply: req.body.totalSupply,
      price: req.body.price,
      priceUSD: req.body.priceUSD,
      royalty: req.body.royalty,
      link: req.body.link,
      image: req.body.image,
      media: media._id,
      whitelist: whitelistIds,
      trait: traits,
    });

    await serie.save();

    const categoryArray = req.body.category;

    const categoryPromises = categoryArray.map(async (cat) => {
      const element = await Category.findOne({
        name: cat,
      });

      if (!element) {
        const category = new Category({
          name: cat,
        });

        await category
          .save()
          .then((data) => {
            serie.category.push(data._id);
          })
          .catch((err) => {
            console.log(err);
          });
      }
      if (element) {
        serie.category.push(element._id);
      }
    });

    await Promise.all(categoryPromises);
    await serie.save();

    res.send({
      id: serie._id,
      slug: serie.slug,
      chain: chain,
      type: serie.type,
    });
  }
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

// parse sketch
exports.parseSketch = async (req, res) => {
  const htmlContent = req.body.htmlContent;
  const hash = req.body.hash;

  const hashedContent = generateIframe(htmlContent, hash);

  res.status(200).send({
    htmlContent: hashedContent,
  });
};

const generateIframe = (htmlContent, hash) => {
  const hashFunction = `let injectSeed = "${hash}";`;

  htmlContent = htmlContent.replace("___FIDDLER__HASH___", hashFunction);

  return htmlContent;
};

// exports generateIframe with params
exports.generateIframe = generateIframe;

exports.createUserSerie = (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }
  // const loggedInUser = loginController.getLoggedInUserObject(req, res);
  const sketchId = req.body.sketch.id;

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

  const whitelistIds = req.body.whitelisted.map((wh) => {
    return new Whitelist({
      address: wh.address,
      value: Math.floor(wh.value * Math.pow(10, 8)),
    }).save()._id;
  });

  const serie = new Serie({
    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    type: req.body.type,
    sketch: sketchId,
    artists: [req.body.collabs],
    captureDelay: req.body.captureDelay,
    cssSelector: req.body.cssSelector || "body",
    backgroundColor: req.body.backgroundColor,
    display: req.body.display,
    onSale: req.body.onSale,
    totalSupply: req.body.totalSupply,
    price: req.body.price,
    royalty: req.body.royalty,
    link: req.body.link,
    image: req.body.image,
    whitelist: whitelistIds,
  });
  serie
    .save()
    .then(async (serie) => {
      const categoryArray = req.body.category;

      const categoryPromises = categoryArray.map(async (cat) => {
        const element = await Category.findOne({
          name: cat,
        });

        if (!element) {
          const category = new Category({
            name: cat,
          });

          await category
            .save()
            .then((data) => {
              serie.category.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }
        if (element) {
          serie.category.push(element._id);
        }
      });

      await Promise.all(categoryPromises);
      await serie.save();

      res.send({
        id: serie._id,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Error Creating Serie",
      });
    });

  /*
    const options = mail.getMailOptions('pmosi76@gmail.com', req, 'content');
  
  
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
      message: "Fields cannot be empty",
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
          message: "Category not found id " + id,
        });
      } else {
        res.send({
          id: category._id,
          message: "Category deleted successfully!",
        });
      }
    })
    .catch((err) => {
      if (err.kind === "ObjectId" || err.name === "NotFound") {
        return res.status(404).send({
          message: "Category not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Could not delete category id " + id,
      });
    });
};

// set serie views
exports.setViews = (req, res) => {
  const id = req.params.id;

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }

      serie.views = serie.views + 1;
      serie.rank += 1;

      serie
        .save()
        .then((data) => {
          res.send({
            id: data._id,
            views: data.views,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error updating serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + id,
      });
    });
};

// fetch featured collections
exports.fetchFeaturedSeries = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({ featured: true })
      .populate("artists", "username _id imageUrl slug")
      .populate("whitelist", "-__v")
      // .populate('category', '-__v')
      //  .populate('sketch', '_id hash url sizeBytes')
      // .populate("like", "username _id imageUrl slug")

      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of serie) {
          collectionObj.push({
            _id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
            //
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

exports.setFeaturedSeries = async (req, res) => {
  // if req.body.featMode === 0, set featured artists randomly
  // if req.body.featMode === 1, set featured artists manually

  const featMode = req.body.featMode;
  const featIds = req.body.featIds;
  console.log(featIds);
  const collections = await Serie.find({});

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

  res.send({ message: "Featured collections updated" });
};

exports.fetchOnSaleSeries = (req, res) => {
  // const page = req.params.page;
  const sort = parseInt(req.query.sort);

  let sorting = { onSale: -1, date: -1 };
  if (sort === 0) {
    sorting = { onSale: -1, date: -1 };
  } else if (sort === 1) {
    sorting = { onSale: -1, rank: -1 };
  } else if (sort === 2) {
    sorting = { onSale: -1, price: 1 };
  } else if (sort === 3) {
    sorting = { onSale: -1, price: -1 };
  }

  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .sort(sorting)
      // .skip((page - 1) * 10)
      // .limit(10)
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("whitelist", "-__v")
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

exports.fetchTrendingSeries = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .sort({ likes: -1, views: -1, supply: -1 })
      .limit(4)
      .populate("artists", "username _id imageUrl slug")
      // .populate('whitelist', '-__v')
      // .populate('category', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")

      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of serie) {
          collectionObj.push({
            _id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
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

exports.fetchRecommendedSeries = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .sort({ rank: -1 })
      .limit(6)
      .populate("artists", "username _id imageUrl slug")
      .populate("whitelist", "-__v")
      // .populate('category', '-__v')
      //  .populate('sketch', '_id hash url sizeBytes')
      // .populate("like", "username _id imageUrl slug")

      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of serie) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
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
exports.fetchRecommendedSeriesOnSale = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({ onSale: true })
      .sort({ rank: -1 })
      .limit(6)
      .populate("artists", "username _id imageUrl slug")
      // .populate('category', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      // .populate("like", "username _id imageUrl slug")

      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of serie) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
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
exports.fetchRecommendedSeriesByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Serie.find({
      artists: id,
    })
      .sort({ rank: -1 })
      .limit(4)
      .populate("artists", "username _id imageUrl slug")
      // .populate('category', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      // .populate("like", "username _id imageUrl slug")

      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of serie) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
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

exports.fetchRecommendedSeriesOmitArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Serie.find({
      artists: { $ne: id },
    })
      .sort({ rank: -1 })
      .limit(4)
      .populate("artists", "username _id imageUrl slug")
      .populate("whitelist", "-__v")
      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of serie) {
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
exports.fetchLatestSeries = (req, res) => {
  const number = parseInt(req.params.number);

  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .sort({ onSale: -1, date: -1 })
      .limit(number)
      .populate("artists", "username _id imageUrl slug")
      .populate("media", "url width height ratio type")
      // .populate('whitelist', '-__v')
      // .populate('category', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")

      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionObj = [];
        for (const coll of serie) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            subtitle: coll.subtitle,
            description: coll.description,
            // sketch: coll.sketch,
            type: coll.type,
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
            media: coll.media,
            // views: coll.views,
            likes: coll.likes,
            // date: coll.date,
            // featured: coll.featured,
            like: coll.like,
            whitelist: coll.whitelist,
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

exports.fetchLatestSerieByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Serie.find({
      artists: id,
    })
      .sort({ date: -1 })
      .limit(4)
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      // .populate('whitelist', '-__v')
      // .populate("like", "username _id imageUrl slug")
      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(serie);
        }
      });
  });
  return promise;
};

// check if user is owner of serie and delete it
exports.deleteSerie = (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }

      if (!serie.artists.includes(userId)) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      if (serie.supply > 0) {
        return res.status(404).send({
          message: "Serie has supply id: " + id,
        });
      }

      serie
        .remove()
        .then((data) => {
          res.send({
            id: id,
            message: "Serie deleted successfully id: " + id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error deleting serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Serie not delete id " + id,
      });
    });
};

// admin delete serie

exports.adminDeleteSerie = async (req, res) => {
  const id = req.params.id;

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }

      serie
        .remove()
        .then((data) => {
          res.send({
            id: id,
            message: "Serie deleted successfully id: " + id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error deleting serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Serie not delete id " + id,
      });
    });
};

// edit serie
exports.editSerie = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  const collabs = [];

  // check if serie.supply is greater than 0 return error
  // and if user is owner of serie
  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }
  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  if (serie.supply > 0) {
    return res.status(404).send({
      message: "Serie has supply",
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

  Serie.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      artists: [userId, ...collabs],
      captureDelay: req.body.captureDelay,
      cssSelector: req.body.cssSelector,
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
    },
    { new: true }
  )
    .then(async (serie) => {
      const categoryArray = req.body.category;

      const categoryPromises = categoryArray.map(async (cat) => {
        const categoryName = serie.category.map(async (element) => {
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

          await category
            .save()
            .then((data) => {
              serie.category.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        if (element) {
          serie.category.push(element._id);
        }
      });
      await Promise.all(categoryPromises);
      await serie.save();

      res.send({
        id: serie._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + req.params.id,
      });
    });
};

exports.editUserSerie = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const collabs = [];

  // check if serie.supply is greater than 0 return error
  // and if user is owner of serie
  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
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

  Serie.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      artists: [...collabs],
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
      category: [],
      sketch: sketchId,
      modified: new Date().toISOString(),
    },
    { new: true }
  )
    .then(async (serie) => {
      const categoryArray = req.body.category;

      const categoryPromises = categoryArray.map(async (cat) => {
        const categoryName = serie.category.map(async (element) => {
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

          await category
            .save()
            .then((data) => {
              serie.category.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        if (element) {
          serie.category.push(element._id);
        }
      });
      await Promise.all(categoryPromises);
      await serie.save();

      res.send({
        id: serie._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + req.params.id,
      });
    });
};

// Edit Sketch

exports.editSketch = async (req, res) => {
  if (!req.body.sketch || !req.body.media) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const userId = req.userId;

  const user = await User.findById(userId);

  const serieId = req.params.id;

  const sketchId = req.body.sketch.id;

  const sketch = await Sketch.findById(sketchId);

  if (!sketch) {
    return res.status(404).send({
      message: "Sketch not found id " + sketchId,
    });
  }

  const media = await Media.findById(req.body.media.id);

  if (!media) {
    return res.status(404).send({
      message: "Media not found id " + req.body.media.id,
    });
  }

  const serie = await Serie.findById(serieId);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + serieId,
    });
  }

  if (!serie.artists.includes(userId)) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  sketch.hash = req.body.sketch.hash;
  sketch.save();

  media.url = req.body.media.url;

  media.save();

  serie.sketch = sketchId;

  serie.captureDelay = req.body.captureDelay;
  serie.cssSelector = req.body.cssSelector;
  serie.backgroundColor = req.body.backgroundColor;

  serie.save();

  res.status(200).send({
    id: serie._id,
    captureDelay: serie.captureDelay,
    cssSelector: serie.cssSelector,
    backgroundColor: serie.backgroundColor,
    sketchUrl: sketch.url,
    mediaUrl: media.url,
  });
};

exports.editSerieMedia = async (req, res) => {
  if (!req.body.media) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const userId = req.userId;
  const id = req.params.id;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  if (!serie.artists.includes(userId)) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const media = await Media.findById(serie.media);

  if (!media) {
    return res.status(404).send({
      message: "Media not found id " + serie.media,
    });
  }

  media.url = req.body.media.url;
  media.type = req.body.media.type;
  media.width = req.body.media.width;
  media.height = req.body.media.height;
  media.ratio = req.body.media.ratio;

  media.save();

  res.status(200).send({
    id: serie._id,
    media: media,
  });
};

exports.fetchSerieByArtist = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Serie.find({
      artists: id,
    })
      .limit(parseInt(number))
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("trait", "-__v")
      .populate("whitelist", "-__v")
      .populate("like", "username _id imageUrl slug")
      .populate("media", "url width height ratio type")
      .populate("chain", "-__v")
      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(serie);
        }
      });
  });
  return promise;
};

// set serie on sale
exports.setSerieOnSale = async (req, res) => {
  const id = req.params.id;
  const onSale = req.body.onSale;

  const isAdmin = await userIsAdmin(req.userId);

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }

      // check if serie.artists array contains userId
      if (!serie.artists.includes(req.userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      serie.onSale = !onSale;

      serie
        .save()
        .then((serie) => {
          res.send({
            id: serie._id,
            onSale: serie.onSale,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + req.params.id,
      });
    });
};

// set serie on display
exports.setSerieOnDisplay = async (req, res) => {
  const id = req.params.id;

  const isAdmin = await userIsAdmin(req.userId);

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }

      // check if serie.artists array contains userId
      if (!serie.artists.includes(req.userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      serie.display = !serie.display;

      serie
        .save()
        .then((serie) => {
          res.send({
            id: serie._id,
            display: serie.display,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + req.params.id,
      });
    });
};

// edit serie description
exports.editSerieDescription = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const isAdmin = await userIsAdmin(userId);

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }

      // check if serie.artists array contains userId
      if (!serie.artists.includes(userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      serie.description = req.body.description;

      serie
        .save()

        .then((serie) => {
          res.send({
            id: serie._id,
            description: serie.description,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + req.params.id,
      });
    });
};

// edit serie name
exports.editSerieName = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const name = req.body.name;

  const slug = name.toLowerCase().replace(/ /g, "-");

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  // check that  the supply is 0
  if (serie.supply > 0) {
    return res.status(404).send({
      message: "Serie has supply",
    });
  }

  serie.name = name;
  serie.slug = slug;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    name: serie.name,
    slug: serie.slug,
  });
};

// edit serie subtitle
exports.editSerieSubtitle = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  serie.subtitle = req.body.subtitle;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    subtitle: serie.subtitle,
  });
};

// update price, totalSupply and royalty
exports.updateSerie = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }

      // check if serie.artists array contains userId
      if (!serie.artists.includes(userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      if (
        (serie.supply > 0 && req.body.totalSupply > serie.totalSupply) ||
        req.body.totalSupply < serie.supply
      ) {
        return res.status(404).send({
          message: "Total supply cannot be greater than " + serie.totalSupply,
        });
      }

      serie.onSale = req.body.onSale;
      serie.price = req.body.price;
      serie.totalSupply = req.body.totalSupply;
      serie.royalty = req.body.royalty;

      serie
        .save()
        .then((serie) => {
          res.send({
            id: serie._id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Serie",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + req.params.id,
      });
    });
};

// updateSerieTrait
exports.updateSerieTrait = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  // check if each traits exists with same trait_type and value
  const traits = [];
  const traitArray = req.body.traits;
  const newTraits = [];

  for (const trait of traitArray) {
    const traitType = trait.trait_type;
    const value = trait.value;

    const traitExist = await Trait.findOne({
      trait_type: traitType,
      value: value,
    });

    if (!traitExist) {
      const newTrait = new Trait({
        trait_type: traitType,
        value: value,
      });

      await newTrait.save();
      traits.push(newTrait._id);
    } else {
      traits.push(traitExist._id);
    }
  }

  serie.trait.push(...traits);

  await serie.save();

  for (const trait of traits) {
    const fetchTrait = await Trait.findById(trait);
    newTraits.push(fetchTrait);
  }

  res.status(200).send({
    id: serie._id,
    trait: newTraits,
  });
};

// remove serie trait
exports.removeSerieTrait = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const traitId = req.body.traitId;

  const traitIndex = serie.trait.indexOf(traitId);

  if (traitIndex === -1) {
    return res.status(404).send({
      message: "Trait not found id " + traitId,
    });
  }

  serie.trait.splice(traitIndex, 1);

  await serie.save();

  res.status(200).send({
    id: serie._id,
    traitId: traitId,
  });
};

// update serie category
exports.updateSerieCategory = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }
  const categories = [];
  const categoryArray = req.body.category;
  const newCategories = [];

  for (const cat of categoryArray) {
    const categoryExist = await Category.findOne({
      name: cat,
    });

    if (!categoryExist) {
      const category = new Category({
        name: cat,
      });

      await category.save();
      categories.push(category._id);
    } else {
      categories.push(categoryExist._id);
    }
  }

  serie.category.push(...categories);

  await serie.save();

  for (const cat of categories) {
    const fetchCategory = await Category.findById(cat);
    newCategories.push(fetchCategory);
  }

  res.status(200).send({
    id: serie._id,
    categories: newCategories,
  });
};

// removeSerieCategory
exports.removeSerieCategory = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const categoryId = req.body.categoryId;

  const categoryIndex = serie.category.indexOf(categoryId);

  if (categoryIndex === -1) {
    return res.status(404).send({
      message: "Category not found id " + categoryId,
    });
  }

  serie.category.splice(categoryIndex, 1);

  await serie.save();

  res.status(200).send({
    id: serie._id,
    categoryId: categoryId,
  });
};

// update serie price
exports.updateSeriePrice = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  serie.price = req.body.price;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    price: serie.price,
  });
};

// updateSeriePriceUSD
exports.updateSeriePriceUSD = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  serie.priceUSD = req.body.priceUSD;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    priceUSD: serie.priceUSD,
  });
};

// updateSerieRoyalty
exports.updateSerieRoyalty = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  serie.royalty = req.body.royalty;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    royalty: serie.royalty,
  });
};

// updateSerieVolume
exports.updateSerieVolume = async (req, res) => {
  const id = req.params.id;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  serie.volume = req.body.volume;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    volume: serie.volume,
  });
};

// updateSerieSupply
exports.updateSerieSupply = async (req, res) => {
  const id = req.params.id;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  if (serie.supply > 0 && req.body.supply > serie.totalSupply) {
    return res.status(404).send({
      message: "Supply cannot be greater than " + serie.totalSupply,
    });
  }

  serie.supply = req.body.supply;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    supply: serie.supply,
  });
};

// update serie total supply
exports.updateSerieTotalSupply = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if serie.artists array contains userId
  if (!serie.artists.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  if (serie.supply > 0 && req.body.totalSupply > serie.totalSupply) {
    return res.status(404).send({
      message: "Total supply cannot be greater than " + serie.totalSupply,
    });
  }

  serie.totalSupply = req.body.totalSupply;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    totalSupply: serie.totalSupply,
  });
};

exports.updateSerieWhitelist = async (req, res) => {
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

  Serie.findById(id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }

      // check if serie.artists array contains userId
      if (!serie.artists.includes(userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      serie.whitelist = whitelistIds;

      serie
        .save()
        .then((serie) => {
          res.send({
            id: serie._id,
            whitelist: whitelisted,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Whitelist",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Serie not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Serie not update id " + id,
      });
    });
};

exports.toggleReviewSerie = async (req, res) => {
  const id = req.params.id;

  const serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  serie.reviewed = !serie.reviewed;

  await serie.save();

  res.status(200).send({
    id: serie._id,
    reviewed: serie.reviewed,
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

// delete serie whitelist by address
/*
  exports.removeWhitelistAddress = async (req, res) => {
    const userId = req.userId;
    const id = req.params.id;

    const user = await User.findById(userId);

    const address = user.ordinalAddress;

    const serie = await Serie.findById(id)
        .populate('whitelist', '-__v');

    if (!serie) {
      return res.status(404).send({
        message: 'Serie not found id ' + id,
      });
    }

    const whitelist = serie.whitelist.find((wh) => wh.address === address);

    if (!whitelist) {
      return res.status(404).send({
        message: 'Address not found',
      });
    }

    const index =
    serie.whitelist.findIndex((wh) => wh.address === address);

    if (index > -1) {
      serie.whitelist.splice(index, 1);
    }

    await serie.save();

    // remove whitelist serie object
    await Whitelist.findByIdAndRemove(whitelist._id);

    res.send({
      id: serie._id,
      address: address,
    });
  };
  */
/*
exports.likeSerie = (req, res) => {
  Serie.findById(req.params.id)
    .then((serie) => {
      if (!serie) {
        return res.status(404).send({
          message: 'Serie not found',
        });
      }

      const like = serie.like;
      let likes = serie.likes;
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

      serie.like = like;
      serie.likes = likes;
      serie.rank += 5;
      serie.save();

      res.send({
        id: serie._id,
        like: serie.like,
        likes: serie.likes,
      });

      // res.send({});
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error liking Serie',
      });
    });
};
*/

exports.likeSerie = async (req, res) => {
  const id = req.params.id;
  let serie;

  serie = await Serie.findById(id);

  if (!serie) {
    return res.status(404).send({
      message: "Serie not found id " + id,
    });
  }

  const like = serie.like;
  let likes = serie.likes;
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

  serie.like = like;
  serie.likes = likes;
  serie.rank += 5;
  await serie.save();

  serie = await Serie.findById(id).populate(
    "like",
    "username _id imageUrl slug"
  );

  res.status(200).send({
    id: serie._id,
    like: serie.like,
    likes: serie.likes,
  });
};

// total number of collections
exports.numberOfSeries = async (req, res) => {
  const collectionsCount = await Serie.countDocuments();

  return collectionsCount;
};

exports.numberOfLikedSeries = async (req, res) => {
  const id = req.params.id;

  const collectionsCount = await Serie.countDocuments({
    like: id,
  });

  return collectionsCount;
};

// collections liked by user
exports.fetchLikedSeries = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;
  const promise = new Promise((resolve, reject) => {
    Serie.find({
      // look for user id in like array
      like: id,
    })
      .limit(parseInt(number))
      .populate("artists", "username _id imageUrl slug")
      .populate("category", "-__v")
      // .populate('whitelist', '-__v')
      // .populate("like", "username _id imageUrl slug")
      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(serie);
        }
      });
  });
  return promise;
};

// fetch highest volume collections
exports.fetchHighestVolumeSeries = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Serie.find({})
      .sort({ supply: -1, price: -1 })
      .limit(6)
      .populate("artists", "username _id imageUrl slug")
      // .populate('category', '-__v')
      .exec((err, serie) => {
        if (!serie) {
          return resolve([]);
        }

        const collectionArray = [];

        for (const coll of serie) {
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
  const collections = await Serie.find({}).populate("whitelist", "-__v");

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
      message: "Whitelist not found id " + id,
    });
  }

  whitelist.used = !whitelist.used;

  await whitelist.save();

  res.status(200).send({
    id: id,
    message: "Whitelist spot used",
  });
};

exports.setWhitelistSpotPaid = async (req, res) => {
  const id = req.params.id;
  const whitelist = await Whitelist.findById(id);

  if (!whitelist) {
    return res.status(404).send({
      message: "Whitelist not found id " + id,
    });
  }

  whitelist.paid = !whitelist.paid;

  await whitelist.save();

  res.status(200).send({
    id: id,
    message: "Whitelist spot paid",
  });
};

exports.numberOfSeriesPerArstistId = async (req, res) => {
  const id = req.params.id;

  const collectionsNumber = await Serie.countDocuments({
    artists: id,
  });

  return collectionsNumber;
};

// percentage of ownership per serie id
exports.percentageOfOwnership = async (req, res) => {};

// get volume per serie id
exports.volumeOfSerie = async (req, res) => {
  const id = req.params.id;

  const serie = await Serie.findById(id);

  const volume = serie.supply * serie.price;

  res.status(200).send({
    volume: volume,
  });
};

// generate slug for each collections from name
/*
exports.generateSlug = async (req, res) => {
  const collections = await Serie.find({});

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
// for each serie field serie.onSaleInscriptions
/*
exports.updateOnSaleInscriptions = async (req, res) => {
  const collections = await Serie.find({});

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
exports.updateSerieImageLink = async (req, res) => {
  const collections = await Serie.find({});

  for (const coll of collections) {
    const sketch = Sketch.findById(coll.sketch);
    if (!sketch) {
      continue;
    }
    const url = sketch.url.replace('api/serie/', 'storage/serie/');
    if (coll.image === url) {
      continue;
    }
    sketch.url = url;
    await sketch.save();
  }

  res.status(200).send({
    message: 'Serie image link updated',
  });
};
*/

exports.updateSerieSketchUrl = async (req, res) => {
  const collections = await Serie.find({});

  for (const coll of collections) {
    const sketch = await Sketch.findById(coll.sketch);
    if (!sketch) {
      continue;
    }
    const url = sketch.url.replace("storage/serie/", "/storage/serie/");

    sketch.url = url;
    await sketch.save();
  }

  res.status(200).send({
    message: "Serie sketch updated",
  });
};
