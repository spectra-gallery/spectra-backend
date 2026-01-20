const Serie = require('../models/serie.model');
const Element = require('../models/element.model');
const User = require('../models/user.model');
const mail = require('../middlewares/mail');
const { path } = require('chromium');

require('dotenv').config();

/*
exports.fetchAllSeriesByNumber = (req, res) => {
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
    Serie.find({})
      .sort(sorting)
      .limit(number)
      .populate('artists', 'username _id imageUrl slug')
      .populate('category', '-__v')
      .populate('media', '_id url ratio type')
      .populate('whitelist', '-__v')
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
            whitelist: coll.whitelist
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
*/

exports.fetchAllElementsByNumber = async (req, res) => {
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

    const elements = await Element.find({})
        .sort(sorting)
        .limit(number)
        .populate({
            path: 'artists',
            populate: {
                path: 'bitcoin',
                select: 'cardinalAddress ordinalAddress',
            },
            select: '_id username imageUrl slug bitcoin',
        })

        .populate('media', '_id url ratio type')
        .populate('like', 'username _id imageUrl slug')
        .populate('chain', 'name _id')
        .populate('trait', '-__v')
        .populate({
            path: 'owner',
            populate: {
                path: 'bitcoin',
                select: 'cardinalAddress ordinalAddress',
            },
            select: '_id username imageUrl slug bitcoin',
        })
        .exec();

    if (!elements) {
        return res.status(404).send({ ok: false, error: 'not_found', reqId: req.context && req.context.id });
    }

    const elementObj = [];

    for (const element of elements) {
        elementObj.push({
            id: element._id,
            name: element.name,
            subtitle: element.subtitle,
            slug: element.slug,
            tokenId: element.tokenId,
            iteration: element.iteration,
            address: element.address,
            media: element.media,
            artists: element.artists,
            owner: element.owner,
            serieRef: element.serieRef,
            trait: element.trait,
            onSale: element.onSale,
            // onChain: element.onChain,
            // royalty: element.royalty,
            // views: element.views,
            like: element.like,
            likes: element.likes,
            chain: element.chain,
            date: element.date,
            // lastTx: element.lastTx,
            // link: element.link,
        });
    }

    return res.status(200).send({ ok: true, data: { elements: elementObj }, reqId: req.context && req.context.id });
}

exports.fetchElementById = async (req, res) => {

    const id = req.params.id;

    const element = await Element.findById(id)
        .populate({
            path: 'artists',
            populate: {
                path: 'bitcoin',
                select: 'cardinalAddress ordinalAddress',
            },
            select: '_id username imageUrl slug bitcoin',
        })

        .populate('media', '_id url ratio type')
        .populate('like', 'username _id imageUrl slug')
        .populate('chain', 'name _id')
        .populate('trait', '-__v')
        .populate({
            path: 'owner',
            populate: {
                path: 'bitcoin',
                select: 'cardinalAddress ordinalAddress',
            },
            select: '_id username imageUrl slug bitcoin',
        })
        .exec();

    if (!element) {
        return res.status(404).send({ ok: false, error: 'not_found', reqId: req.context && req.context.id });
    }
    return res.status(200).send({ ok: true, data: { element }, reqId: req.context && req.context.id });
};
