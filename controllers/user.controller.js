// import models directly to reduce circular require warnings
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Medium = require("../models/medium.model");
const Apply = require("../models/apply.model");
const Serie = require("../models/serie.model");
const Post = require("../models/post.model");
const Portfolio = require("../models/portfolio.model");
const Podcast = require("../models/podcast.model");
const Word = require("../models/word.model");
const Theme = require("../models/theme.model");
const mail = require("../middlewares/mail");
const { address } = require("bitcoinjs-lib");

// const discord = require('../middlewares/discord');
require("dotenv").config();

const dataViz = require("../config/dataviz.config");

// username to user id
exports.usernameToId = async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({
    slug: username,
  });

  if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

  return res.status(200).send({
    id: user._id,
  });
};

exports.setViews = (req, res) => {
  const id = req.params.id;

  User.findById(id)
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: "User not found id " + id,
        });
      }

      user.views = user.views + 1;
      // user.rank += 1;

      user
        .save()
        .then((data) => {
          res.send({
            id: data._id,
            views: data.views,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error updating user views id " + id,
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "User not found id " + id,
        });
      }
      return res.status(500).send({
        message: "User views not updated " + id,
      });
    });
};

exports.numberOfUsersSort = async (req, res) => {
  const role = req.params.role;
  const medium = req.query.medium;

  let roleParam = {};
  let mediumParam = {};

  if (role === "all") {
    role_exp = {};
  } else {
    const roleId = await Role.findOne({
      name: role,
    });
    roleParam = { role: roleId };
  }

  if (medium === "all") {
    medium_exp = {};
  } else {
    const mediumId = await Medium.findOne({
      name: medium,
    });
    mediumParam = { mediums: mediumId };
  }

  const userCout = await User.countDocuments({
    ...roleParam,
    ...mediumParam,
  });

  return userCout;
};

exports.fetchUsers = (req, res) => {
  const sort = parseInt(req.query.sort);

  let sorting = { username: 1 };
  if (sort === 0) {
    sorting = { trendingIndex: -1 };
  } else if (sort === 1) {
    sorting = { username: 1 };
  } else if (sort === 2) {
    sorting = { username: -1 };
  } else if (sort === 3) {
    sorting = { date: -1 };
  } else if (sort === 4) {
    sorting = { date: 1 };
  }

  const promise = new Promise((resolve, reject) => {
    User.find({})
      .sort(sorting)
      // .skip((page - 1) * 10)
      /* .populate({
            path: 'comments',
            populate: {
              path: 'author',
              select: 'username _id imageUrl',
            },
            select: 'content author date',
          }) */
      .populate("trait", "-__v")
      .populate("like", "username _id imageUrl")
      .populate("role", "-__v")
      .exec((err, user) => {
        const userObj = [];
        for (const usr of user) {
          userObj.push({
            id: usr._id,
            username: usr.username,
            slug: usr.slug,
            address: usr.address,
            // bannerUrl: usr.bannerUrl,
            imageUrl: usr.imageUrl,
            role: usr.role,
            // website: usr.website,
            headline: usr.headline,
            bio: usr.bio,
            // twitter: usr.twitter,
            whitelisted: usr.whitelisted,
            verified: usr.verified,
            applied: usr.applied,
            creator: usr.creator,
            trait: usr.trait,
            views: usr.views,
            // trendingIndex: usr.trendingIndex,
            // featured: usr.featured,
            // date: usr.date,
            comments: usr.comments,
            channelId: usr.channelId,
            lastLogin: usr.lastLogin,
          });
        }

        resolve(userObj);
        if (err) reject(err);
      });
  });
  return promise;
};

// fetch 10 last logged in users
exports.fetchLastLoggedInUsers = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    User.find({})
      .sort({ lastLogin: -1 })
      .limit(10)
      .populate("role", "-__v")
      .exec((err, user) => {
        const userObj = [];
        for (const usr of user) {
          userObj.push({
            id: usr._id,
            username: usr.username,
            slug: usr.slug,
            cardinalAddress: usr.cardinalAddress,
            ordinalAddress: usr.ordinalAddress,
            role: usr.role,
            lastLogin: usr.lastLogin,
          });
        }

        if (err) reject(err);
        else resolve(userObj);
      });
  });
  return promise;
};

exports.fetchUserSelect = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    User.find({})
      .select("username _id address bitcoin")
      .populate("bitcoin", "-__v")
      .exec((err, user) => {
        const userObj = [];

        for (const usr of user) {
          userObj.push({
            id: usr._id,
            username: usr.username,
            address: usr.address,
            bitcoin: usr.bitcoin,
          });
        }

        if (err) reject(err);
        else resolve(userObj);
      });
  });

  return promise;
};

exports.fetchArtists = (req, res) => {
  const sort = parseInt(req.query.sort);

  let sorting = { username: 1 };
  if (sort === 0) {
    sorting = { trendingIndex: -1 };
  } else if (sort === 1) {
    sorting = { username: 1 };
  } else if (sort === 2) {
    sorting = { username: -1 };
  } else if (sort === 3) {
    sorting = { date: -1 };
  } else if (sort === 4) {
    sorting = { date: 1 };
  }

  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });

      if (!role) {
        return resolve([]);
      }

      User.find({ role: role._id })
        .sort(sorting)
        // .skip((page - 1) * 10)
        /* .populate({
            path: 'comments',
            populate: {
              path: 'author',
              select: 'username _id imageUrl',
            },
            select: 'content author date',
          }) */
        .populate("like", "username _id imageUrl")
        .populate("trait", "-__v")
        .populate("role", "-__v")
        .exec((err, user) => {
          const userObj = [];
          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              address: usr.address,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              role: usr.role,
              // website: usr.website,
              headline: usr.headline,
              bio: usr.bio,
              // twitter: usr.twitter,
              whitelisted: usr.whitelisted,
              verified: usr.verified,
              applied: usr.applied,
              creator: usr.creator,
              trait: usr.trait,
              // trendingIndex: usr.trendingIndex,
              // featured: usr.featured,
              // date: usr.date,
              views: usr.views,
              like: usr.like,
              likes: usr.likes,
            });
          }

          resolve(userObj);
          if (err) reject(err);
        });
    })();
  });
  return promise;
};

/*
exports.fetchArtistById = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: 'creator',
      });
      User.findOne({
        _id: req.params.id,
        role: role._id,
      })
          .populate({
            path: 'comments',
            populate: [
              {
                path: 'author',
                select: 'username _id imageUrl',
              },
              {
                path: 'discord',
                select: 'username id',
              },
            ],
            select: 'content author date discord',
          })
          
          .populate('twitter', '-__v')
          .populate('discord', '-__v')
          .populate('role', '-__v')
          .exec((err, user) => {
            if (!user) {
              return resolve({});
            }

            const userObj = {
              id: user._id,
              username: user.username,
              slug: user.slug,
              cardinalAddress: user.cardinalAddress,
              ordinalAddress: user.ordinalAddress,
              bannerUrl: user.bannerUrl,
              imageUrl: user.imageUrl,
              role: user.role,
              website: user.website,
              headline: user.headline,
              bio: user.bio,
              twitter: user.twitter,
              instagram: user.instagram,
              discord: user.discord,
              whitelisted: user.whitelisted,
              verified: user.verified,
              applied: user.applied,
              trendingIndex: user.trendingIndex,
              featured: user.featured,
              date: user.date,
              section: user.section,
              comments: user.comments,
              channelId: user.channelId,
              like: user.like,
              likes: user.likes,
            };

            resolve(userObj);
            if (err) reject(err);
          });
    })();
  });
  return promise;
};
*/

exports.fetchArtistById = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });
      User.findOne({
        _id: req.params.id,
        role: role._id,
      })
        .populate({
          path: "comments",
          options: { sort: { date: -1 } },
          populate: [
            {
              path: "author",
              select: "username _id imageUrl",
            },
            {
              path: "discord",
              select: "username id",
            },
          ],
          select: "content author date discord",
        })

        .populate("twitter", "-__v")
        .populate("discord", "-__v")
        .populate("like", "username _id imageUrl")
        .populate("role", "-__v")
        .populate("trait", "-__v")
        .populate("frequentWords", "-__v")
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = {
            id: user._id,
            username: user.username,
            slug: user.slug,
            address: user.address,
            bannerUrl: user.bannerUrl,
            imageUrl: user.imageUrl,
            role: user.role,
            website: user.website,
            headline: user.headline,
            bio: user.bio,
            twitter: user.twitter,
            instagram: user.instagram,
            discord: user.discord,
            whitelisted: user.whitelisted,
            verified: user.verified,
            customer: user.customer,
            creator: user.creator,
            applied: user.applied,
            date: user.date,
            mediums: user.mediums,
            chains: user.chains,
            views: user.views,
            like: user.like,
            likes: user.likes,
            trait: user.trait,
            frequentWords: user.frequentWords
          };

          resolve(userObj);
          if (err) reject(err);
        });
    })();
  });
  return promise;
};

exports.fetchArtistsByRoleSort = (req, res) => {
  const number = parseInt(req.params.number);
  const sort = parseInt(req.query.sort);
  const role = req.query.role;
  const medium = req.query.medium;

  console.log(number, sort, role, medium);

  let role_exp = {};
  let medium_exp = {};

  let sorting = { date: -1 };
  if (sort === 0) {
    sorting = { date: -1 };
  } else if (sort === 1) {
    sorting = { date: -1 };
  } else if (sort === 2) {
    sorting = { views: -1 };
  } else if (sort === 3) {
    sorting = { like: -1 };
  } else if (sort === 4) {
    sorting = { volume: -1 };
  } else if (sort === 5) {
    sorting = { lastLogin: -1 };
  }

  if (role !== "all") {
    // check if array of object serie.categories contains category.name === req.body.category
    role_exp = { "role.name": role };
  }

  if (medium !== "all") {
    // check if array of object serie.categories contains category.name === req.body.category
    medium_exp = { "mediums.name": medium };
  }

  const promise = new Promise((resolve, reject) => {
    User.aggregate([
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "_id",
          as: "role",
        },
      },
      /*
      {
        $unwind: "$role",
      },
      */
      {
        $lookup: {
          from: "mediums",
          localField: "medium",
          foreignField: "_id",
          as: "medium",
        },
      },
      {
        $unwind: "$mediums",
      },

      {
        $match: {
          ...role_exp,
          ...medium_exp,
        },
      },
      // prevent duplicates
      {
        $group: {
          _id: "$_id",
          username: { $first: "$username" },
          slug: { $first: "$slug" },
          bitcoin: { $first: "$bitcoin" },
          address: { $first: "$address" },
          headline: { $first: "$headline" },
          website: { $first: "$website" },
          imageUrl: { $first: "$imageUrl" },
          twitter: { $first: "$twitter" },
          instagram: { $first: "$instagram" },
          discord: { $first: "$discord" },
          likes: { $first: "$likes" },
          views: { $first: "$views" },
          date: { $first: "$date" },
          verified: { $first: "$verified" },
          mediums: { $first: "$medius" },
          like: { $first: "$like" },
          volume: { $first: "$volume" },
          role: { $first: "$role" },
          trait: { $first: "$trait" },
        },
      },

      { $sort: sorting },
      { $limit: number },

      {
        $lookup: {
          from: "twitter",
          localField: "twitters",
          foreignField: "_id",
          as: "twitters",
          pipeline: [
            {
              $project: {
                _id: 1,
                id: 1,
                username: 1,
                displayName: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "discord",
          localField: "discords",
          foreignField: "_id",
          as: "discords",
          pipeline: [
            {
              $project: {
                _id: 1,
                id: 1,
                username: 1,
              },
            },
          ],
        },
      },

      {
        $lookup: {
          from: "like",
          localField: "like",
          foreignField: "_id",
          as: "like",
        },
      },
      {
        $lookup: {
          from: "bitcoin",
          localField: "bitcoin",
          foreignField: "_id",
          as: "bitcoin",
        },
      },
      {
        $lookup: {
          from: "traits",
          localField: "trait",
          foreignField: "_id",
          as: "trait",
        },
      },
    ]).exec((err, filteredUsers) => {
      if (err) {
        reject(err);
      } else {
        const userArray = [];

        for (const user of filteredUsers) {
          userArray.push({
            id: user._id,
            username: user.username,
            slug: user.slug,
            bitcoin: user.bitcoin,
            address: user.address,
            headline: user.headline,
            website: user.website,
            imageUrl: user.imageUrl,
            twitter: user.twitter,
            instagram: user.instagram,
            discord: user.discord,
            likes: user.likes,
            views: user.views,
            date: user.date,
            verified: user.verified,
            mediums: user.mediums,
            like: user.like,
            volume: user.volume,
            role: user.role,
            trait: user.trait,
          });
        }
        console.log(userArray);
        resolve(userArray);
      }
    });
  });

  /*
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: 'creator',
      });
      User.findOne({
        _id: req.params.id,
        role: role._id,
      })
        .populate({
          path: 'comments',
          options: { sort: { 'date': -1 } },
          populate: [
            {
              path: 'author',
              select: 'username _id imageUrl',
            },
            {
              path: 'discord',
              select: 'username id',
            },
          ],
          select: 'content author date discord',
        })

        .populate('twitter', '-__v')
        .populate('discord', '-__v')
        .populate('like', 'username _id imageUrl')
        .populate('role', '-__v')
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = {
            id: user._id,
            username: user.username,
            slug: user.slug,
            address: user.address,
            bannerUrl: user.bannerUrl,
            imageUrl: user.imageUrl,
            role: user.role,
            website: user.website,
            headline: user.headline,
            bio: user.bio,
            twitter: user.twitter,
            instagram: user.instagram,
            discord: user.discord,
            whitelisted: user.whitelisted,
            verified: user.verified,
            customer: user.customer,
            creator: user.creator,
            applied: user.applied,
            date: user.date,
            mediums: user.mediums,
            chains: user.chains,
            views: user.views,
            like: user.like,
            likes: user.likes,
          };

          resolve(userObj);
          if (err) reject(err);
        });
    })();
  });
  */
  return promise;
};

exports.fetchUserById = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    User.findById(req.params.id)
      /* .populate({
        path: 'comments',
        populate: [
          {
            path: 'author',
            select: 'username _id imageUrl',
          },
          {
            path: 'discord',
            select: 'username id',
          },
        ],
        select: 'content author date discord',
      }) */
      //
      .populate("twitter", "-__v")
      .populate("discord", "-__v")
      .populate("mediums", "-__v")
      .populate("chains", "-__v")
      .populate("like", "username _id imageUrl")
      .populate("role", "-__v")
      .populate("trait", "-__v")
      .populate("frequentWords", "-__v")
      .exec((err, user) => {
        if (!user) {
          return resolve({});
        }

        const userObj = {
          id: user._id,
          username: user.username,
          slug: user.slug,
          address: user.address,
          bannerUrl: user.bannerUrl,
          imageUrl: user.imageUrl,
          role: user.role,
          website: user.website,
          headline: user.headline,
          bio: user.bio,
          twitter: user.twitter,
          instagram: user.instagram,
          discord: user.discord,
          whitelisted: user.whitelisted,
          verified: user.verified,
          creator: user.creator,
          applied: user.applied,
          customer: user.customer,
          date: user.date,
          mediums: user.mediums,
          views: user.views,
          chains: user.chains,
          like: user.like,
          likes: user.likes,
          trait: user.trait,
          frequentWords: user.frequentWords,
        };

        resolve(userObj);
        if (err) reject(err);
      });
  });
  return promise;
};

// fetch artist by ordinal address
exports.fetchArtistByOrdinalAddress = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });
      User.findOne({
        ordinalAddress: req.params.address,
        role: role._id,
      })
        .populate({
          path: "comments",
          populate: {
            path: "author",
            select: "username _id imageUrl",
          },
          populate: {
            path: "discord",
            select: "username id",
          },
          select: "content author date discord",
        })

        .populate("role", "-__v")
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = {
            id: user._id,
            username: user.username,
            slug: user.slug,
            cardinalAddress: user.cardinalAddress,
            ordinalAddress: user.ordinalAddress,
            bannerUrl: user.bannerUrl,
            imageUrl: user.imageUrl,
            role: user.role,
            website: user.website,
            headline: user.headline,
            bio: user.bio,
            twitter: user.twitter,
            instagram: user.instagram,
            discord: user.discord,
            whitelisted: user.whitelisted,
            verified: user.verified,
            applied: user.applied,
            trendingIndex: user.trendingIndex,
            featured: user.featured,
            date: user.date,
            section: user.section,
            comments: user.comments,
            channelId: user.channelId,
          };

          resolve(userObj);
          if (err) reject(err);
        });
    })();
  });
  return promise;
};

// fetch artist of a collection
exports.fetchArtistBySerie = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });
      const serie = await Serie.findById(req.params.id);

      if (!serie) {
        return;
      }

      const artists = serie.artists;

      const ids = artists.map((artist) => artist._id);

      User.find({
        _id: { $in: ids },
        role: role._id,
      })
        /* .populate({
            path: 'comments',
            populate: {
              path: 'author',
              select: 'username _id imageUrl',
            },
            select: 'content author date',
          }) */
        //
        // .populate('role', '-__v')
        .populate("like", "username _id imageUrl")
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = [];

          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              // cardinalAddress: usr.cardinalAddress,
              // ordinalAddress: usr.ordinalAddress,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              // role: usr.role,
              website: usr.website,
              headline: usr.headline,
              bio: usr.bio,
              like: usr.like,
              // twitter: usr.twitter,
              // section: usr.section,
            });
          }

          resolve(userObj);

          if (err) reject(err);
        });
    })();
  });
  return promise;
};

// fetchArtistByPost
exports.fetchArtistByPost = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });

      const post = await Post.findById(req.params.id);

      if (!post) {
        return resolve({});
      }

      const artists = post.author;

      const ids = artists.map((artist) => artist._id);

      User.find({
        _id: { $in: ids },
        role: role._id,
      })

        .populate("role", "-__v")
        .populate("like", "username _id imageUrl")
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = [];

          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              // cardinalAddress: usr.cardinalAddress,
              // ordinalAddress: usr.ordinalAddress,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              // role: usr.role,
              website: usr.website,
              headline: usr.headline,
              bio: usr.bio,
              like: usr.like,
              // twitter: usr.twitter,
            });
          }

          resolve(userObj);

          if (err) reject(err);
        });
    })();
  });
  return promise;
};

exports.fetchArtistByPodcast = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });

      const podcast = await Podcast.findById(req.params.id);

      if (!podcast) {
        return resolve({});
      }

      const artists = podcast.author;

      const ids = artists.map((artist) => artist._id);

      User.find({
        _id: { $in: ids },
        role: role._id,
      })

        .populate("role", "-__v")
        .populate("like", "username _id imageUrl")
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = [];

          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              // cardinalAddress: usr.cardinalAddress,
              // ordinalAddress: usr.ordinalAddress,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              // role: usr.role,
              website: usr.website,
              headline: usr.headline,
              bio: usr.bio,
              like: usr.like,
              // twitter: usr.twitter,
            });
          }

          resolve(userObj);

          if (err) reject(err);
        });
    })();
  });
  return promise;
};

// fetchArtistByPortfolio
exports.fetchArtistByPortfolio = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });

      const portfolio = await Portfolio.findById(req.params.id);

      if (!portfolio) {
        return resolve({});
      }

      const artists = portfolio.authors;

      const ids = artists.map((artist) => artist._id);

      User.find({
        _id: { $in: ids },
        role: role._id,
      })

        .populate("role", "-__v")
        .populate("like", "username _id imageUrl")
        .exec((err, user) => {
          if (!user) {
            return resolve({});
          }

          const userObj = [];

          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              // cardinalAddress: usr.cardinalAddress,
              // ordinalAddress: usr.ordinalAddress,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              // role: usr.role,
              website: usr.website,
              headline: usr.headline,
              bio: usr.bio,
              like: usr.like,
              // twitter: usr.twitter,
            });
          }

          resolve(userObj);

          if (err) reject(err);
        });
    })();
  });

  return promise;
};

// fetch featured artists
exports.fetchFeaturedArtists = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });

      if (!role) {
        return resolve([]);
      }

      User.find({
        featured: true,
        role: role._id,
      })
        /* .populate({
            path: 'comments',
            populate: {
              path: 'author',
              select: 'username _id imageUrl',
            },
            select: 'content author date',
          }) */
        .populate("role", "-__v")
        .exec((err, user) => {
          const userObj = [];
          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              cardinalAddress: usr.cardinalAddress,
              ordinalAddress: usr.ordinalAddress,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              role: usr.role,
              website: usr.website,
              // headline: usr.headline,
              bio: usr.bio,
              twitter: usr.twitter,
              instagram: usr.instagram,
              discord: usr.discord,
              whitelisted: usr.whitelisted,
              verified: usr.verified,
              // applied: usr.applied,
              // trendingIndex: usr.trendingIndex,
              // featured: usr.featured,
              // date: usr.date,
              comments: usr.comments,
              channelId: usr.channelId,
            });
          }

          resolve(userObj);

          if (err) reject(err);
        });
    })();
  });
  return promise;
};

// get highest volume artists
exports.fetchHighestVolumeArtists = async (req, res) => {
  const role = await Role.findOne({
    name: "creator",
  });

  if (!role) {
    return res.status(404).send({
      message: "Role not found",
    });
  }

  const artists = await User.find({ role: role._id }).limit(6);
  const collections = await Collection.find({});

  const artistObj = [];

  for (const artist of artists) {
    let volume = 0;
    for (const collection of collections) {
      if (collection.artists.includes(artist._id)) {
        volume += collection.volume;
      }
    }
    artistObj.push({
      id: artist._id,
      username: artist.username,
      slug: artist.slug,
      // cardinalAddress: artist.cardinalAddress,
      // ordinalAddress: artist.ordinalAddress,
      // bannerUrl: artist.bannerUrl,
      imageUrl: artist.imageUrl,
      // role: artist.role,
      // website: artist.website,
      // headline: artist.headline,
      // bio: artist.bio,
      // twitter: artist.twitter,
      // whitelisted: artist.whitelisted,
      // verified: artist.verified,
      // applied: artist.applied,
      // trendingIndex: artist.trendingIndex,
      // featured: artist.featured,
      // date: artist.date,
      // comments: artist.comments,
      volume: volume,
    });
  }

  artistObj.sort((a, b) => {
    return b.volume - a.volume;
  });

  res.status(200).send(artistObj);
};

// set featured artists
exports.setFeaturedArtists = async (req, res) => {
  // if req.body.featMode === 0, set featured artists randomly
  // if req.body.featMode === 1, set featured artists manually

  const featMode = req.body.featMode;
  const featIds = req.body.featIds;

  const users = await User.find({});

  // set all featured to false
  for (const user of users) {
    user.featured = false;
    await user.save();
  }

  if (featMode === 0) {
    // set 3 random users to featured
    for (let i = 0; i < 6; i++) {
      const random = Math.floor(Math.random() * users.length);
      users[random].featured = true;
      await users[random].save();
    }
  } else if (featMode === 1) {
    // set all artists matching the ids to featured
    for (const key in users) {
      if (featIds.includes(users[key]._id.toString())) {
        users[key].featured = true;
        await users[key].save();
      }
    }
  }

  res.send({ message: "Featured artists updated" });
};

// like user
exports.likeUser = (req, res) => {
  User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: "User not found",
        });
      }

      const like = user.like;
      let likes = user.likes;
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

      user.like = like;
      user.likes = likes;

      user.save();

      res.status(200).send({
        id: user._id,
        like: user.like,
        likes: user.likes,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Error liking user",
      });
    });
};

/*
exports.fetchLikedCollections = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Collection.find({
      like: id,
    })
        .limit(parseInt(number))
        .populate('artists', 'username _id imageUrl')
        .populate('category', '-__v')
    // .populate("like", "username _id imageUrl")
        .exec((err, collection) => {
          if (!collection) {
            return resolve([]);
          }

          resolve(collection);
          if (err) reject(err);
        });
  });
  return promise;
};
*/

// fetch liked users by user id
exports.fetchLikedUsers = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    (async () => {
      const role = await Role.findOne({
        name: "creator",
      });
      User.find({
        like: id,
        role: role._id,
      })
        .populate("role", "-__v")
        .exec((err, user) => {
          if (!user) {
            return resolve([]);
          }

          const userObj = [];
          for (const usr of user) {
            userObj.push({
              id: usr._id,
              username: usr.username,
              slug: usr.slug,
              // bannerUrl: usr.bannerUrl,
              imageUrl: usr.imageUrl,
              headline: usr.headline,
            });
          }

          resolve(userObj);
          if (err) reject(err);
        });
    })();
  });
  return promise;
};

// commentCreator
exports.commentCreator = async (req, res) => {
  const _id = req.params.id;
  const userId = req.userId;
  const user = await User.findById(userId)
    // populate user comments.author with username imageUrl and id
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "username _id imageUrl",
      },
      select: "_id content author date",
    });

  const comment = new Comment({
    content: req.body.content,
    author: userId,
    discord: user.discord,
  });
  comment
    .save()
    .then((data) => {
      addComment(data._id);
      res.send({
        id: data._id,
        userId: _id,
        username: user.username,
        imageUrl: user.imageUrl,
        content: data.content,
        author: data.author,
        date: data.date,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Error creating comment",
      });
    });

  const addComment = (id) => {
    User.findById(_id)
      .then((_user) => {
        if (!_user) {
          return res.status(404).send({
            message: "User not found",
          });
        }
        _user.comments.push(id);
        _user.save();

        discord.sendMessageToChannel(
          comment.content,
          _user.channelId,
          user.username
        );

        // res.send({});
      })
      .catch((err) => {
        return res.status(500).send({
          message: "Error saving comment",
        });
      });
  };
};

exports.deleteComment = async (req, res) => {
  // Check if the user is the owner of the comment
  // or the owner of the media if not return error if yes delete the comment
  const _user = await User.findOne({
    comments: req.params.id,
  });

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  Comment.findByIdAndRemove(req.params.id)
    .then((comment) => {
      if (!comment) {
        return res.status(404).send({
          message: "Comment not found id " + req.params.id,
        });
      }

      // if user is not the owner of the profile nor the author of the comment
      if (
        comment.author._id != req.userId &&
        _user._id != req.userId &&
        !isAdmin
      ) {
        return res.status(403).send({
          message: "You are not the owner of this comment",
        });
      }
    })
    .catch((err) => {
      if (err.kind === "ObjectId" || err.name === "NotFound") {
        return res.status(404).send({
          message: "Comment not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Comment not delete id " + req.params.id,
      });
    });

  // delete comment from user, find user by the comment id in comments array
  User.findOne({
    comments: req.params.id,
  })
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: "User not found",
        });
      }
      user.comments.pull(req.params.id);
      user.save();

      res.send({
        id: req.params.id,
        userId: user._id,
      });
    })
    .catch((err) => {
      console.log(err);
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

exports.whitelistAddress = async (req, res) => {
  const address = req.body.address;

  const user = await User.findOne({
    cardinalAddress: address,
  });

  if (user) {
    user.whitelisted = true;
    await user.save();
  }

  res.status(200).send({
    id: user._id,
    whitelisted: user.whitelisted,
  });
};

exports.whitelistUserById = async (req, res) => {
  const id = req.params.id;

  const user = await User.findOne({
    _id: id,
  });

  if (user) {
    user.whitelisted = !user.whitelisted;
    await user.save();
  }

  res.status(200).send({
    id: user._id,
    whitelisted: user.whitelisted,
  });
};

exports.whitelistAddressReq = async (req, res) => {
  const id = req.userId;
  const address = req.body.address;

  const user = await User.findOne({
    _id: id,
  });

  const data = {
    ...user,
    whitelistAddress: address,
  };

  const mailAddress = "pmosi76@gmail.com";

  const options = mail.getMailOptions(mailAddress, data, "whitelist");

  mail.sendMail(options, (err, info) => {
    if (err) {
      // console.log(err);
    } else {
      // console.log(info);
    }
  });

  res.status(200).send({
    message: "Email sent",
  });
};

// admin delete user
exports.deleteUserById = async (req, res) => {
  const id = req.params.id;

  // delete user
  await User.deleteOne({
    _id: id,
  });

  res.status(200).send({
    id: id,
  });
};

exports.getRoles = async (req, res) => {
  const roles = await Role.find();

  const rolesArray = [];

  for (const role of roles) {
    rolesArray.push({
      id: role._id,
      name: role.name,
    });
  }

  res.status(200).send({
    roles: rolesArray,
  });
};

exports.getMediums = async (req, res) => {
  const mediums = await Medium.find();

  const mediumsArray = [];

  for (const medium of mediums) {
    console.log(medium);
    mediumsArray.push({
      id: medium._id,
      name: medium.name,
    });
  }

  res.status(200).send({
    mediums: mediumsArray,
  });
};

exports.createMedium = async (req, res) => {
  if (!req.body.name) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const mediums = await Medium.find({
    name: req.body.name,
  });

  console.log(mediums);

  if (mediums && mediums.length > 0) {
    return res.status(400).send({
      message: "Medium already exists",
    });
  }

  const medium = new Medium({
    name: req.body.name,
  });

  await medium.save();

  res.status(200).send({
    id: medium._id,
    name: medium.name,
  });
};

exports.deleteMedium = (req, res) => {
  const id = req.params.id;
  

  Medium.findByIdAndRemove(id)
    .then((medium) => {
      if (!medium) {
        return res.status(404).send({
          message: "Medium not found id " + id,
        });
      } else {
        res.send({
          id: medium._id,
          message: "Medium deleted successfully!",
        });
      }
    })
    .catch((err) => {
      if (err.kind === "ObjectId" || err.name === "NotFound") {
        return res.status(404).send({
          message: "Medium not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Could not delete Medium id " + id,
      });
    });
};

// change user role
exports.changeUserRole = async (req, res) => {
  const id = req.params.id;
  const roleId = req.body.role;

  const user = await User.findOne({
    _id: id,
  });

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  const role = await Role.findById(roleId);

  if (user.role.includes(roleId)) {
    user.role.pull(roleId);

    if (role.name === "creator") {
      user.creator = false;
    }
  } else {
    user.role.push(roleId);

    if (role.name === "creator") {
      user.creator = true;
    }
  }
  await user.save();

  const newUser = await User.findOne({ _id: id }).populate("role", "-__v");

  const authorities = [];

  for (const role of newUser.role) {
    authorities.push({
      id: role._id,
      name: "ROLE_" + role.name.toUpperCase(),
    });
  }

  res.status(200).send({
    id: id,
    role: authorities,
  });
};

// change ethereum address
exports.changeAddress = async (req, res) => {
  const id = req.params.id;

  const address = req.body.address;

  const user = await User.findOne({
    _id: id,
  });

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  user.address = address;
  await user.save();

  res.status(200).send({
    id: id,
    address: user.address,
  });
};

// get apply id by user address
exports.getApplyId = async (req, res) => {
  const address = req.params.address;

  const user = await User.findOne({
    address: address,
  });

  const apply = await Apply.findOne({
    user: user._id,
  });

  if (!apply) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'application_not_found' }, reqId: req.context && req.context.id });

  res.status(200).send({
    id: apply._id,
  });
};

// creator apply
exports.creatorApply = async (req, res) => {
  const id = req.userId;

  const user = await User.findOne({
    _id: id,
  });

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  if (user.applied || user.creator) {
    return res.status(403).send({
      message: "User already applied",
    });
  }

  const apply = new Apply({
    type: req.body.type,
    about: req.body.about,
    links: req.body.links,
    user: id,
  });

  await apply.save();

  user.applied = true;
  await user.save();

  res.status(200).send({
    id: apply._id,
  });
};

// removeApply
exports.removeApply = async (req, res) => {
  const userId = req.userId;

  const id = req.params.id;
  const user = await User.findOne({
    _id: userId,
  });

  const apply = await Apply.findOne({
    _id: id,
  });

  if (!apply) {
    return res.status(404).send({
      message: "Application not found",
    });
  }

  if (apply.user != userId) {
    return res.status(403).send({
      message: "User not authorized",
    });
  }

  await apply.remove();

  user.applied = false;
  await user.save();

  res.status(200).send({
    id: id,
    message: "Application removed",
  });
};

// get applications by user id
exports.getApplications = async (req, res) => {
  const id = req.userId;

  const applications = await Apply.find({
    user: id,
  });

  if (!applications) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'applications_not_found' }, reqId: req.context && req.context.id });
  res.status(200).send({ ok: true, data: { applications }, applications, reqId: req.context && req.context.id });
};

// get creator applications
exports.getCreatorApplications = async (req, res) => {
  // get granted false applications
  const applications = await Apply.find({})
    .populate("grantedBy", "username _id imageUrl")
    .populate("user", "username _id imageUrl");

  if (!applications) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'applications_not_found' }, reqId: req.context && req.context.id });

  const applicationsArray = [];

  for (const application of applications) {
    applicationsArray.push({
      id: application._id,
      type: application.type,
      about: application.about,
      links: application.links,
      user: application.user,
      granted: application.granted,
      grantedBy: application.grantedBy,
      status: application.status,
    });
  }

  res.status(200).send({ ok: true, data: { applications: applicationsArray }, applications: applicationsArray, reqId: req.context && req.context.id });
};

// grant application
exports.grantApplication = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const role = await Role.findOne({
    name: "creator",
  });

  const roleId = role._id;
  let apply;

  apply = await Apply.findOne({
    _id: id,
  }).populate("user", "username _id imageUrl");

  if (!apply) {
    return res.status(404).send({
      message: "Application not found",
    });
  }

  const user = await User.findOne({
    _id: apply.user._id,
  });

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  if (user.whitelisted) {
    return res.status(403).send({
      message: "User already whitelisted",
    });
  }

  if (user.role.includes(roleId)) {
    return res.status(403).send({
      message: "User already has this role",
    });
  }

  user.role.push(roleId);
  user.creator = true;
  user.whitelisted = true;
  await user.save();

  apply.granted = true;
  apply.grantedBy = userId;
  apply.status = "granted";
  await apply.save();

  /*
  const mailAddress = 'pmosi76@gmail.com';

  const options = mail.getMailOptions(mailAddress, apply, 'apply_granted');

  mail.sendMail(options, (err, info) => {
    if (err) {
      // console.log(err);
    } else {
      // console.log(info);
    }
  });
  */

  apply = await Apply.findOne({
    _id: id,
  }).populate("grantedBy", "username _id imageUrl");

  res.status(200).send({ ok: true, data: { id: apply._id, granted: apply.granted, grantedBy: apply.grantedBy, status: apply.status }, id: apply._id, granted: apply.granted, grantedBy: apply.grantedBy, status: apply.status, reqId: req.context && req.context.id });
};

// deny application
exports.denyApplication = async (req, res) => {
  const id = req.params.id;

  let apply;

  apply = await Apply.findOne({
    _id: id,
  }).populate("user", "username _id imageUrl");

  if (!apply) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'application_not_found' }, reqId: req.context && req.context.id });

  const user = await User.findOne({
    _id: apply.user._id,
  });

  if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

  const role = await Role.findOne({
    name: "creator",
  });

  const roleId = role._id;

  if (user.role.includes(roleId)) {
    user.role.pull(roleId);
  }

  user.whitelisted = false;
  user.creator = false;
  await user.save();

  apply.granted = false;
  apply.status = "denied";

  await apply.save();

  apply = await Apply.findOne({
    _id: id,
  }).populate("grantedBy", "username _id imageUrl");

  res.status(200).send({ ok: true, data: { id: apply._id, granted: apply.granted, grantedBy: apply.grantedBy, status: apply.status }, id: apply._id, granted: apply.granted, grantedBy: apply.grantedBy, status: apply.status, reqId: req.context && req.context.id });
};

// admin remove application
exports.adminRemoveApplication = async (req, res) => {
  const id = req.params.id;

  const apply = await Apply.findOne({
    _id: id,
  });

  if (!apply) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'application_not_found' }, reqId: req.context && req.context.id });

  await apply.remove();

  res.status(200).send({ ok: true, data: { id }, id, message: 'Application removed', reqId: req.context && req.context.id });
};

// Retrieve and return section by id from the database.
exports.fetchSection = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Section.findById(req.params.id)
      .populate("user", "-__v")
      .exec((err, section) => {
        if (err) {
          reject(err);
        }
        const sectionObj = {
          id: section._doc._id,
          title: section._doc.title,
          content: section._doc.content,
          mediaUrls: section._doc.mediaUrls,
        };
        resolve(sectionObj);
      });
  });
  return promise;
};

// Retrieve and return all sections from article by id from the database.
exports.fetchSections = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    User.find({
      _id: req.params.id,
    })
    .exec((err, user) => {
      if (err) {
        reject(err);
      }
      const sectionObj = [];

      // iterate over every users
      for (const usr of user) {
        for (const sec of usr.section) {
          sectionObj.push({
            id: sec._doc._id,
            title: sec._doc.title,
            content: sec._doc.content,
            mediaUrls: sec._doc.mediaUrls,
          });
        }
      }
      resolve(sectionObj);
    });
  });
  return promise;
};

exports.addressToUser = async (req, res) => {
  const address = req.params.address;

  const user = await User.findOne({
    address: address.toLowerCase(),
  });

  if (!user) {
    return null;
  } else {
    return {
      id: user._id,
      username: user.username,
      slug: user.slug,
      imageUrl: user.imageUrl,
    };
  }
};

exports.addressToUsername = async (req, res) => {
  const address = req.params.address;

  const user = await User.findOne({
    ordinalAddress: address,
  });

  if (!user) {
    return null;
  } else {
    return {
      id: user._id,
      username: user.username,
    };
  }
};



exports.getThemesByUserId = async (req, res) => {
    const userId = req.params.id;

    const themes = await Theme.find({
        author: userId
    })
        .populate("palette", "-__v");

    if (!themes) {
        res.status(404).send({
            message: "Theme not found",
        });
        return;
    }

    res.status(200).send({
        themes,
    });
};

const setFrequentWords = async () => {
  try {
    const artists = await User.find({});

    Word.deleteMany({}, () => {
      console.log("Words deleted");
    });

  

    for (const artist of artists) {

      artist.frequentWords = [];

      const posts = await Post.find({
        author: artist._id,
      })
        .populate("section", "-__v")


      const words = [];

      for (const post of posts) {

        for (const section of post.section) {
          const content = section.content.split(" ");

          for (const word of content) {
            words.push(word);
          }
        }

        const content = post.description.split(" ");

        for (const word of content) {
          words.push(word);
        }
      }

      const series = await Serie.find({
        artists: artist._id,
      });

      for (const serie of series) {
        const content = serie.description.split(" ");

        for (const word of content) {
          words.push(word);
        }
      }

      const wordCount = {};

      for (const word of words) {
        if (wordCount[word]) {
          wordCount[word] += 1;
        } else {
          wordCount[word] = 1;
        }
      }

      const sortable = [];

      const worldIds = [];

      for (const word in wordCount) {

        const stopwords = [
          "the",
          "and",
          "to",
          "of",
          "a",
          "in",
          "for",
          "is",
          "on",
          "with",
          "that",
          "by",
          "this",
          "are",
          "it",
          "as",
          "from",
          "at",
          "or",
          "an",
          "be",
          "you",
          "your",
          "our",
          "we",
          "us",
          "i",
          "my",
          "me",
          "he",
          "she",
          "him",
          "her",
          "they",
          "them",
          "their",
          "his",
          "its",
          "who",
          "whom",
          "whose",
          "which",
          "what",
          "where",
          "when",
          "why",
          "how",
          "if",
          "else",
          "then",
          "than",
          "though",
          "although",
          "because",
          "since",
          "while",
          "before",
          "after",
          "during",
          "until",
          "unless",
          "nor",
          "not",
          "only",
          "either",
          "neither",
          "both",
          "each",
          "every",
          "all",
          "any",
          "some",
          "such",
          "no",
          "nor",
          "too",
          "enough",
          "so",
          "that",
          "such",
          "enough",
          "quite",
          "very",
          "as",
          "less",
          "more",
          "many",
          "few",
          "most",
          "least",
          "only",
          "own",
          "other",
          "another",
          "next",
          "last",
          "first",
          "second",
          "third",
          "fourth",
          "fifth",
          "sixth",
          "seventh",
          "eighth",
          "ninth",
          "tenth",
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
          "ten",
          "about",
          "against",
          "between",
          "into",
          "through",
          "toward",
          "under",
          "above",
          "below",
          "upon",
          "along",
          "behind",
          "across",
          "around",
          "before",
          "beneath",
          "beside",
          "between",
          "beyond",
          "inside",
          "outside",
          "underneath",
        ];
        // if the world is a stop word, skip it
        if (stopwords.includes(word) || word.length < 5 || wordCount[word] < 5) {
          continue;
        }

        sortable.push([word, wordCount[word]]);

        const worldData = new Word({
          name: word,
          frequency: wordCount[word],
        });

        await worldData.save();

        worldIds.push(worldData._id);
      }

      artist.frequentWords = worldIds;

      await artist.save();
    }

    console.log("Frequent words set");
  } catch (err) {
    console.log(err);
  }
};

exports.setFrequentWords = setFrequentWords;

setFrequentWords();

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
/*
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
*/
