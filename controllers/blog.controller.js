const db = require("../models");
const mail = require("../middlewares/mail");
// const discord = require('../middlewares/discord');
require("dotenv").config();
const Post = db.post;
const Podcast = db.podcast;
const Trait = db.trait;
const Category = db.category;
const Media = db.media;
const User = db.user;
const Role = db.role;
const Comment = db.comment;
const Section = db.section;

const OWNER_EMAIL = process.env.OWNER_EMAIL;

// slug to post id
exports.slugToId = async (req, res) => {
  const slug = req.params.slug;

  const post = await Post.findOne({ slug: slug });

  if (!post) {
    return res.status(404).send({
      message: "Post not found",
    });
  }

  res.send({
    id: post._id,
  });
};

// slug to post id
exports.slugPodToId = async (req, res) => {
  const slug = req.params.slug;

  const podcast = await Podcast.findOne({ slug: slug });

  if (!podcast) {
    return res.status(404).send({
      message: "Podcast not found",
    });
  }

  res.send({
    id: podcast._id,
  });
};

// get all post name and id
exports.fetchPostName = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Post.find({}, "name slug").exec((err, posts) => {
      if (!posts) {
        return resolve([]);
      }

      const postsObj = [];

      for (const post of posts) {
        postsObj.push({
          id: post._id,
          name: post.name,
          slug: post.slug,
        });
      }

      if (err) reject(err);
      else {
        resolve(postsObj);
      }
    });
  });
  return promise;
};

exports.fetchPosts = (req, res) => {
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
    Post.find({})
      .sort(sorting)
      // .skip((page - 1) * 10)
      // .limit(10)
      .populate("author", "username _id imageUrl slug")
      .populate("media", "_id url ratio type")
      .populate("category", "-__v")
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")
      .exec((err, posts) => {
        if (!posts) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of posts) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            subtitle: coll.subtitle,
            description: coll.description,
            author: coll.author,
            media: coll.media,
            category: coll.category,
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

exports.getAllPosts = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Post.find({})
      .populate("author", "username _id imageUrl slug")
      .exec((err, posts) => {
        if (!posts) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of posts) {
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

exports.fetchAllPostsByNumber = (req, res) => {
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
    Post.find({})
      .sort(sorting)
      .limit(number)
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("media", "_id url ratio type")
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")
      .exec((err, posts) => {
        if (!posts) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of posts) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
            author: coll.author,
            category: coll.category,
            // captureDelay: coll.captureDelay,

            media: coll.media,
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

exports.fetchGalleryPosts = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Post.find({})
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")

      .exec((err, posts) => {
        if (err) reject(err);
        else {
          resolve(posts);
        }
      });
  });
  return promise;
};

exports.fetchPostById = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Post.findById(id)
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("media", "_id url ratio type")
      .populate("like", "username _id imageUrl slug")
      .populate("section", "-__v")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username _id imageUrl slug",
        },
        select: "_id content author date",
      })

      .exec((err, post) => {
        if (!post) {
          return resolve({});
        }

        const description = post._doc.description;
        // .replace(/\\n/g, '\n');

        const data = {
          id: post._doc._id,
          name: post._doc.name,
          slug: post._doc.slug,
          subtitle: post._doc.subtitle,
          description: description,
          media: post._doc.media,
          author: post._doc.author,
          display: post._doc.display,
          section: post._doc.section,
          views: post._doc.views,
          like: post._doc.like,
          likes: post._doc.likes,
          comments: post._doc.comments,
          date: post._doc.date,
          lastModified: post._doc.lastModified,
          reviewed: post._doc.reviewed,
          reviewDate: post._doc.reviewDate,
          reviewedBy: post._doc.reviewedBy,
          published: post._doc.published,
          category: post._doc.category,
          links: post._doc.link,
          references: post._doc.references,
        };
        if (err) reject(err);
        else {
          resolve(data);
        }
      });
  });
  return promise;
};

exports.fetchPodcastById = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Podcast.findById(id)
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("like", "username _id imageUrl slug")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username _id imageUrl slug",
        },
        select: "_id content author date",
      })

      .exec((err, podcast) => {
        if (!podcast) {
          return resolve({});
        }

        const description = podcast._doc.description;
        // .replace(/\\n/g, '\n');

        const data = {
          id: podcast._doc._id,
          name: podcast._doc.name,
          slug: podcast._doc.slug,
          subtitle: podcast._doc.subtitle,
          description: description,
          audioUrl: podcast._doc.audioUrl,
          author: podcast._doc.author,
          views: podcast._doc.views,
          like: podcast._doc.like,
          likes: podcast._doc.likes,
          comments: podcast._doc.comments,
          date: podcast._doc.date,
          category: podcast._doc.category,
          links: podcast._doc.link,
          references: podcast._doc.references,
        };
        if (err) reject(err);
        else {
          resolve(data);
        }
      });
  });
  return promise;
};

// fetch random posts using aggregate
exports.fetchRandomPost = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Post.aggregate([
      { $sample: { size: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
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
    ]).exec((err, posts) => {
      if (!posts) {
        return resolve({});
      }

      const data = {
        id: posts[0]._id,
        name: posts[0].name,
        slug: posts[0].slug,
        description: posts[0].description,
        image: posts[0].image,
        author: posts[0].author,
        supply: posts[0].supply,
        totalSupply: posts[0].totalSupply,
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
exports.fetchRandomPost = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Post.find({})
        .populate('author', 'username _id imageUrl slug')
        // .populate('category', '-__v')
    // .populate('sketch', '_id hash url sizeBytes')
    // .populate("like", "username _id imageUrl slug")
        .exec((err, posts) => {
          if (!posts) {
            return resolve({});
          }

          const random = Math.floor(Math.random() * posts.length) || 0;

          const data = {
            id: posts[random]._doc._id,
            name: posts[random]._doc.name,
            slug: posts[random]._doc.slug,
            description: posts[random]._doc.description,
            image: posts[random]._doc.image,
            // sketch: posts[random]._doc.sketch,
            // inscriptions: posts[random]._doc.inscriptions,
            author: posts[random]._doc.author,
            // captureDelay: posts[random]._doc.captureDelay,
            // onSale: posts[random]._doc.onSale,
            // views: posts[random]._doc.views,
            // rank: posts[random]._doc.rank,
            // like: posts[random]._doc.like,
            // likes: posts[random]._doc.likes,
            supply: posts[random]._doc.supply,
            totalSupply: posts[random]._doc.totalSupply,
            // price: posts[random]._doc.price,
            // royalty: posts[random]._doc.royalty,
            // volume: posts[random]._doc.volume,
            // date: posts[random]._doc.date,
            // category: posts[random]._doc.category,
            // link: posts[random]._doc.link,
          };

          resolve(data);

          if (err) reject(err);
        });
  });

  return promise;
};
*/

exports.createPost = async (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const userId = req.userId;

  const user = await User.findById(userId);

  const media = new Media({
    url: req.body.media.url,
    width: req.body.media.width,
    height: req.body.media.height,
    ratio: req.body.media.ratio,
    type: req.body.media.type,
  });

  await media.save();

  const slug = req.body.name.toLowerCase().replace(/ /g, "-");

  const post = new Post({
    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    author: [userId, ...req.body.collabs],
    section: req.body.section,
    display: req.body.display,
    links: req.body.links,
    references: req.body.references,
    media: media._id,
  });

  await post.save();

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
          post.category.push(data._id);
        })
        .catch((err) => {
          console.log(err);
        });
    }
    if (element) {
      post.category.push(element._id);
    }
  });

  await Promise.all(categoryPromises);
  await post.save();

  res.send({
    id: post._id,
    slug: post.slug,
  });

  sendMail(OWNER_EMAIL, post, "content");
};

exports.createPodcast = async (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const userId = req.userId;

  const user = await User.findById(userId);

  const media = new Media({
    url: req.body.media.url,
    width: req.body.media.width,
    height: req.body.media.height,
    ratio: req.body.media.ratio,
    type: req.body.media.type,
  });

  await media.save();

  const slug = req.body.name.toLowerCase().replace(/ /g, "-");

  const podcast = new Podcast({
    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    author: [userId, ...req.body.collabs],
    links: req.body.links,
    references: req.body.references,
    media: media._id,
    audioUrl: req.body.audioUrl
  });

  await podcast.save();

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
          post.category.push(data._id);
        })
        .catch((err) => {
          console.log(err);
        });
    }
    if (element) {
      podcast.category.push(element._id);
    }
  });

  await Promise.all(categoryPromises);
  await podcast.save();

  res.send({
    id: podcast._id,
    slug: podcast.slug,
  });

  // sendMail(OWNER_EMAIL, post, "content");
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

exports.createUserPost = (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: "Fields cannot be empty",
    });
  }

  const slug = req.body.name.toLowerCase().replace(/ /g, "-");

  const post = new Post({
    name: req.body.name,
    slug: slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    author: [req.body.collabs],
    display: req.body.display,
    links: req.body.links,
    image: req.body.image,
  });
  post
    .save()
    .then(async (post) => {
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
              post.category.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }
        if (element) {
          post.category.push(element._id);
        }
      });

      await Promise.all(categoryPromises);
      await post.save();

      res.send({
        id: post._id,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Error Creating Post",
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

// set post views
exports.setViews = (req, res) => {
  const id = req.params.id;

  Post.findById(id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: "Post not found id " + id,
        });
      }

      post.views = post.views + 1;

      post
        .save()
        .then((data) => {
          res.send({
            id: data._id,
            views: data.views,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error updating post",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Post not update id " + id,
      });
    });
};

// fetch featured posts
exports.fetchFeaturedPosts = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    Post.find({ featured: true })
      .populate("author", "username _id imageUrl slug")
      // .populate('category', '-__v')
      //  .populate('sketch', '_id hash url sizeBytes')
      // .populate("like", "username _id imageUrl slug")

      .exec((err, post) => {
        if (!post) {
          return resolve([]);
        }

        const collectionObj = [];

        for (const coll of post) {
          collectionObj.push({
            _id: coll._id,
            name: coll.name,
            slug: coll.slug,
            description: coll.description,
            // sketch: coll.sketch,
            //
            author: coll.author,
            // category: coll.category,
            // captureDelay: coll.captureDelay,
            media: coll.media,
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

exports.setFeaturedPosts = async (req, res) => {
  // if req.body.featMode === 0, set featured author randomly
  // if req.body.featMode === 1, set featured author manually

  const featMode = req.body.featMode;
  const featIds = req.body.featIds;
  console.log(featIds);
  const posts = await Post.find({});

  // set all featured to false
  for (const coll of posts) {
    coll.featured = false;
    await coll.save();
  }

  if (featMode === 0) {
    // set 3 random posts to featured
    for (let i = 0; i < 6; i++) {
      const random = Math.floor(Math.random() * posts.length) || 0;
      posts[random].featured = true;
      await posts[random].save();
    }
  } else if (featMode === 1) {
    // set all author matching the ids to featured
    for (const coll of posts) {
      if (featIds.includes(coll._id.toString())) {
        coll.featured = true;
        await coll.save();
      }
    }
  }

  res.send({ message: "Featured posts updated" });
};

// fetch latest posts
exports.fetchLatestPosts = (req, res) => {
  const number = parseInt(req.params.number);

  const promise = new Promise((resolve, reject) => {
    Post.find({})
      .sort({ date: -1 })
      .limit(number)
      .populate("author", "username _id imageUrl slug")
      .populate("media", "url width height ratio type")
      // .populate('whitelist', '-__v')
      // .populate('category', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")

      .exec((err, post) => {
        if (!post) {
          return resolve([]);
        }

        const collectionObj = [];
        for (const coll of post) {
          collectionObj.push({
            id: coll._id,
            name: coll.name,
            slug: coll.slug,
            subtitle: coll.subtitle,
            description: coll.description,
            // sketch: coll.sketch,
            author: coll.author,
            // category: coll.category,
            // captureDelay: coll.captureDelay,
            media: coll.media,
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

// fetch latest podcasts
exports.fetchLatestPodcasts = (req, res) => {
  const number = parseInt(req.params.number);

  const promise = new Promise((resolve, reject) => {
    Podcast.find({})
      .sort({ date: -1 })
      .limit(number)
      .populate("author", "username _id imageUrl slug")
      .populate("media", "url width height ratio type")
      // .populate('whitelist', '-__v')
      // .populate('category', '-__v')
      // .populate('sketch', '_id hash url sizeBytes')
      .populate("like", "username _id imageUrl slug")

      .exec((err, podcast) => {
        if (!podcast) {
          return resolve([]);
        }

        const podcastObj = [];
        for (const pod of podcast) {
          podcastObj.push({
            id: pod._id,
            name: pod.name,
            slug: pod.slug,
            subtitle: pod.subtitle,
            description: pod.description,
            // sketch: coll.sketch,
            author: pod.author,
            media: pod.media,
            // category: coll.category,
            // captureDelay: coll.captureDelay,
            audioUrl: pod.audioUrl,
            // views: coll.views,
            likes: pod.likes,
            // date: coll.date,
            // featured: coll.featured,
            like: pod.like,
          });
        }
        if (err) reject(err);
        else {
          resolve(podcastObj);
        }
      });
  });

  return promise;
};

// fetch latest posts by author

exports.fetchLatestPostByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Post.find({
      author: id,
    })
      .sort({ date: -1 })
      .limit(4)
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      // .populate('whitelist', '-__v')
      // .populate("like", "username _id imageUrl slug")
      .exec((err, post) => {
        if (!post) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(post);
        }
      });
  });
  return promise;
};

exports.fetchLatestPodcastByArtist = (req, res) => {
  const id = req.params.id;

  const promise = new Promise((resolve, reject) => {
    Podcast.find({
      author: id,
    })
      .sort({ date: -1 })
      .limit(4)
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("media", "-__v")
      // .populate('whitelist', '-__v')
      .populate("like", "username _id imageUrl slug")
      .exec((err, podcast) => {
        if (!podcast) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(podcast);
        }
      });
  });
  return promise;
};

// check if user is owner of post and delete it
exports.deletePost = (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  Post.findById(id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: "Post not found id " + id,
        });
      }

      if (!post.author.includes(userId)) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      if (post.supply > 0) {
        return res.status(404).send({
          message: "Post has supply id: " + id,
        });
      }

      post
        .remove()
        .then((data) => {
          res.send({
            id: id,
            message: "Post deleted successfully id: " + id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error deleting post",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Post not delete id " + id,
      });
    });
};

// admin delete post

exports.adminDeletePost = async (req, res) => {
  const id = req.params.id;

  Post.findById(id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: "Post not found id " + id,
        });
      }

      post
        .remove()
        .then((data) => {
          res.send({
            id: id,
            message: "Post deleted successfully id: " + id,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error deleting post",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + id,
        });
      }
      return res.status(500).send({
        message: "Post not delete id " + id,
      });
    });
};

// edit post
exports.editPost = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const userId = req.userId;
  const isAdmin = await userIsAdmin(userId);

  const collabs = [];

  // check if post.supply is greater than 0 return error
  // and if user is owner of post
  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }
  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  if (post.supply > 0) {
    return res.status(404).send({
      message: "Post has supply",
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

  Post.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      author: [userId, ...collabs],
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
    .then(async (post) => {
      const categoryArray = req.body.category;

      const categoryPromises = categoryArray.map(async (cat) => {
        const categoryName = post.category.map(async (element) => {
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
              post.category.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        if (element) {
          post.category.push(element._id);
        }
      });
      await Promise.all(categoryPromises);
      await post.save();

      res.send({
        id: post._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Post not update id " + req.params.id,
      });
    });
};

exports.editUserPost = async (req, res) => {
  const id = req.params.id;

  const sketchId = req.body.sketch.id;

  const collabs = [];

  // check if post.supply is greater than 0 return error
  // and if user is owner of post
  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
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

  Post.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      slug: slug,
      subtitle: req.body.subtitle,
      description: req.body.description,
      author: [...collabs],
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
    .then(async (post) => {
      const categoryArray = req.body.category;

      const categoryPromises = categoryArray.map(async (cat) => {
        const categoryName = post.category.map(async (element) => {
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
              post.category.push(data._id);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        if (element) {
          post.category.push(element._id);
        }
      });
      await Promise.all(categoryPromises);
      await post.save();

      res.send({
        id: post._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Post not update id " + req.params.id,
      });
    });
};

exports.createSection = (req, res) => {
  if (!req.body.title || !req.body.content) {
    return res.status(400).send({
      message: "Section Fields cannot be empty",
    });
  }
  //const loggedInUser = loginController.getLoggedInUserObject(req, res);

  const section = new Section({
    title: req.body.title,
    content: req.body.content,
    imageUrl: req.body.imageUrl,
  });
  section
    .save()
    .then((data) => {
      res.send({
        id: data._id,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Error Section",
      });
    });
};
// Retrieve and return section by id from the database.
exports.fetchSection = (req, res) => {
  Section.findById(req.params.id).exec((err, section) => {
    const sectionObj = {
      id: section._id,
      title: section._doc.title,
      content: section._doc.content,
      imageUrl: section._doc.imageUrl,
    };
    res.send(sectionObj);
    if (err) {
      return res.status(500).send({
        message: "Error retrieving section with id " + req.params.id,
      });
    }
  });
};

// Retrieve and return all sections from article by id from the database.
exports.fetchSections = (req, res) => {
  Post.findById(req.params.id)
    .populate("section", "-__v")
    .exec((err, article) => {
      res.send(article.section);
      if (err) {
        return res.status(500).send({
          message: "Error retrieving sections with id " + req.params.id,
        });
      }
    });
};

// edit section
exports.editSection = (req, res) => {
  if (!req.body.title || !req.body.content) {
    return res.status(400).send({
      message: "Section Fields cannot be empty",
    });
  }

  Section.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
      content: req.body.content,
      imageUrl: req.body.imageUrl,
    },
    {
      new: true,
    }
  )
    .then((section) => {
      if (!section) {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      res.send({
        id: section._id,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating section with id " + req.params.id,
      });
    });
};

exports.editSectionTitle = (req, res) => {
  if (!req.body.title) {
    return res.status(400).send({
      message: "Section Fields cannot be empty",
    });
  }

  Section.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
    },
    {
      new: true,
    }
  )
    .then((section) => {
      if (!section) {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      res.status(200).send({
        id: section._id,
        title: section.title,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating section with id " + req.params.id,
      });
    });
};

exports.editSectionContent = (req, res) => {
  if (!req.body.content) {
    return res.status(400).send({
      message: "Section Fields cannot be empty",
    });
  }

  Section.findByIdAndUpdate(
    req.params.id,
    {
      content: req.body.content,
    },
    {
      new: true,
    }
  )
    .then((section) => {
      if (!section) {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      res.status(200).send({
        id: section._id,
        content: section.content,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating section with id " + req.params.id,
      });
    });
};

exports.editSectionImageUrl = (req, res) => {
  if (!req.body.imageUrl) {
    return res.status(400).send({
      message: "Section Fields cannot be empty",
    });
  }

  Section.findByIdAndUpdate(
    req.params.id,
    {
      imageUrl: req.body.imageUrl,
    },
    {
      new: true,
    }
  )
    .then((section) => {
      if (!section) {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      res.status(200).send({
        id: section._id,
        imageUrl: section.imageUrl,
      });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Section not found with id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Error updating section with id " + req.params.id,
      });
    });
};

exports.fetchPostByArtist = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Post.find({
      author: id,
    })
      .limit(parseInt(number))
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("like", "username _id imageUrl slug")
      .populate("media", "url width height ratio type")
      .exec((err, post) => {
        if (!post) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(post);
        }
      });
  });
  return promise;
};

exports.fetchPodcastByArtist = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {
    Podcast.find({
      author: id,
    })
      .limit(parseInt(number))
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("like", "username _id imageUrl slug")
      .populate("media", "url width height ratio type")
      .exec((err, podcast) => {
        if (!podcast) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(podcast);
        }
      });
  });
  return promise;
};

// set post on display
exports.setPostOnDisplay = async (req, res) => {
  const id = req.params.id;

  const isAdmin = await userIsAdmin(req.userId);

  Post.findById(id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }

      // check if post.author array contains userId
      if (!post.author.includes(req.userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      post.display = !post.display;

      post
        .save()
        .then((post) => {
          res.send({
            id: post._id,
            display: post.display,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Post",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Post not update id " + req.params.id,
      });
    });
};

exports.commentPost = async (req, res) => {
  const _id = req.params.id;
  const userId = req.userId;
  const user = await User.findById(userId);

  const comment = new Comment({
    content: req.body.comment,
    author: userId,
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
    Post.findById(_id)
      .then((_serie) => {
        if (!_serie) {
          return res.status(404).send({
            message: "Post not found",
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

  const post = await Post.findOne({ comments: commentId });

  if (!post) {
    return res.status(404).send({
      message: "No comment found in post",
    });
  }

  const index = post.comments.indexOf(commentId);

  if (index > -1) {
    post.comments.splice(index, 1);
  }

  await post.save();

  // delete comment
  await Comment.findByIdAndDelete(commentId);

  res.status(200).send({
    id: commentId,
    serieId: post._id,
  });
};

// edit post name
exports.editPodcastName = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const name = req.body.name;

  const slug = name.toLowerCase().replace(/ /g, "-");

  const post = await Podcast.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  // check that  the supply is 0
  if (post.supply > 0) {
    return res.status(404).send({
      message: "Post has supply",
    });
  }

  post.name = name;
  post.slug = slug;

  await post.save();

  res.status(200).send({
    id: post._id,
    name: post.name,
    slug: post.slug,
  });
};

// edit post subtitle
exports.editPodcastSubtitle = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const post = await Podcast.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  post.subtitle = req.body.subtitle;

  await post.save();

  res.status(200).send({
    id: post._id,
    subtitle: post.subtitle,
  });
};

exports.editPostDescription = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const isAdmin = await userIsAdmin(userId);

  Post.findById(id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }

      // check if post.author array contains userId
      if (!post.author.includes(userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      post.description = req.body.description;

      post
        .save()

        .then((post) => {
          res.send({
            id: post._id,
            description: post.description,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Post",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Post not update id " + req.params.id,
      });
    });
};

// edit post description
exports.editPodcastDescription = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const isAdmin = await userIsAdmin(userId);

  Podcast.findById(id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }

      // check if post.author array contains userId
      if (!post.author.includes(userId) && !isAdmin) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      post.description = req.body.description;

      post
        .save()

        .then((post) => {
          res.send({
            id: post._id,
            description: post.description,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Error Editing Post",
          });
        });
    })
    .catch((err) => {
      if (err.kind === "ObjectId") {
        return res.status(404).send({
          message: "Post not found id " + req.params.id,
        });
      }
      return res.status(500).send({
        message: "Post not update id " + req.params.id,
      });
    });
};

exports.editPodcastAudio = async (req, res) => {
  const id = req.params.id

  const userId = req.userId;

  const podcast = await Podcast.findById(id);

  if (!podcast) {
    return res.status(404).send({
      message: "Podcast not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!podcast.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  podcast.audioUrl = req.body.audioUrl;

  await podcast.save();

  res.status(200).send({
    id: podcast._id,
    audioUrl: podcast.audioUrl
  })
}

exports.editPodcastMedia = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const podcast = await Podcast.findById(id);

  if (!podcast) {
    return res.status(404).send({
      message: "Podcast not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!podcast.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const media = await Media.findById(podcast.media);

  media.url = req.body.media.url,
  media.width = req.body.media.width,
  media.height = req.body.media.height,
  media.ratio = req.body.media.ratio,
  media.type = req.body.media.type,

  media.save();

  res.status(200).send({
    id: id,
    media: media
  })
  
}

// edit post name
exports.editPostName = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  const name = req.body.name;

  const slug = name.toLowerCase().replace(/ /g, "-");

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }


  post.name = name;
  post.slug = slug;

  await post.save();

  res.status(200).send({
    id: post._id,
    name: post.name,
    slug: post.slug,
  });
};

// edit post subtitle
exports.editPostSubtitle = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  post.subtitle = req.body.subtitle;

  await post.save();

  res.status(200).send({
    id: post._id,
    subtitle: post.subtitle,
  });
};

// update post category
exports.updatePostCategory = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
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

  post.category.push(...categories);

  await post.save();

  for (const cat of categories) {
    const fetchCategory = await Category.findById(cat);
    newCategories.push(fetchCategory);
  }

  res.status(200).send({
    id: post._id,
    categories: newCategories,
  });
};

// removePostCategory
exports.removePostCategory = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const isAdmin = await userIsAdmin(userId);

  // check if post.author array contains userId
  if (!post.author.includes(userId) && !isAdmin) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const categoryId = req.body.categoryId;

  const categoryIndex = post.category.indexOf(categoryId);

  if (categoryIndex === -1) {
    return res.status(404).send({
      message: "Category not found id " + categoryId,
    });
  }

  post.category.splice(categoryIndex, 1);

  await post.save();

  res.status(200).send({
    id: post._id,
    categoryId: categoryId,
  });
};

exports.toggleReviewPost = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  post.reviewed = !post.reviewed;
  post.reviewedBy.push(userId);
  post.reviewDate = new Date().toISOString();

  await post.save();

  res.status(200).send({
    id: post._id,
    reviewed: post.reviewed,
    reviewedBy: post.reviewedBy,
    reviewDate: post.reviewDate,
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

// delete post whitelist by address
/*
  exports.removeWhitelistAddress = async (req, res) => {
    const userId = req.userId;
    const id = req.params.id;

    const user = await User.findById(userId);

    const address = user.ordinalAddress;

    const post = await Post.findById(id)
        .populate('whitelist', '-__v');

    if (!post) {
      return res.status(404).send({
        message: 'Post not found id ' + id,
      });
    }

    const whitelist = post.whitelist.find((wh) => wh.address === address);

    if (!whitelist) {
      return res.status(404).send({
        message: 'Address not found',
      });
    }

    const index =
    post.whitelist.findIndex((wh) => wh.address === address);

    if (index > -1) {
      post.whitelist.splice(index, 1);
    }

    await post.save();

    // remove whitelist post object
    await Whitelist.findByIdAndRemove(whitelist._id);

    res.send({
      id: post._id,
      address: address,
    });
  };
  */
/*
exports.likePost = (req, res) => {
  Post.findById(req.params.id)
    .then((post) => {
      if (!post) {
        return res.status(404).send({
          message: 'Post not found',
        });
      }

      const like = post.like;
      let likes = post.likes;
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

      post.like = like;
      post.likes = likes;
      post.rank += 5;
      post.save();

      res.send({
        id: post._id,
        like: post.like,
        likes: post.likes,
      });

      // res.send({});
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error liking Post',
      });
    });
};
*/

exports.likePost = async (req, res) => {
  const id = req.params.id;
  let post;

  post = await Post.findById(id);

  if (!post) {
    return res.status(404).send({
      message: "Post not found id " + id,
    });
  }

  const like = post.like;
  let likes = post.likes;
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

  post.like = like;
  post.likes = likes;
  post.rank += 5;
  await post.save();

  post = await Post.findById(id).populate("like", "username _id imageUrl slug");

  res.status(200).send({
    id: post._id,
    like: post.like,
    likes: post.likes,
  });
};

// total number of posts
exports.numberOfPosts = async (req, res) => {
  const collectionsCount = await Post.countDocuments();

  return collectionsCount;
};

exports.numberOfLikedPosts = async (req, res) => {
  const id = req.params.id;

  const collectionsCount = await Post.countDocuments({
    like: id,
  });

  return collectionsCount;
};

// posts liked by user
exports.fetchLikedPosts = (req, res) => {
  const id = req.params.id;
  const number = req.query.number;
  const promise = new Promise((resolve, reject) => {
    Post.find({
      // look for user id in like array
      like: id,
    })
      .limit(parseInt(number))
      .populate("author", "username _id imageUrl slug")
      .populate("category", "-__v")
      .populate("media", "url width height ratio type")
      // .populate('whitelist', '-__v')
      // .populate("like", "username _id imageUrl slug")
      .exec((err, post) => {
        if (!post) {
          return resolve([]);
        }
        if (err) reject(err);
        else {
          resolve(post);
        }
      });
  });
  return promise;
};

exports.numberOfPostsPerArstistId = async (req, res) => {
  const id = req.params.id;

  const collectionsNumber = await Post.countDocuments({
    author: id,
  });

  return collectionsNumber;
};

// percentage of ownership per post id
exports.percentageOfOwnership = async (req, res) => {};

// get volume per post id
exports.volumeOfPost = async (req, res) => {
  const id = req.params.id;

  const post = await Post.findById(id);

  const volume = post.supply * post.price;

  res.status(200).send({
    volume: volume,
  });
};

// generate slug for each posts from name
/*
exports.generateSlug = async (req, res) => {
  const posts = await Post.find({});

  for (const coll of posts) {
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
// for each post field post.onSaleInscriptions
/*
exports.updateOnSaleInscriptions = async (req, res) => {
  const posts = await Post.find({});

  let number = 0;

  for (const coll of posts) {
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
exports.updatePostImageLink = async (req, res) => {
  const posts = await Post.find({});

  for (const coll of posts) {
    const sketch = Sketch.findById(coll.sketch);
    if (!sketch) {
      continue;
    }
    const url = sketch.url.replace('api/post/', 'storage/post/');
    if (coll.image === url) {
      continue;
    }
    sketch.url = url;
    await sketch.save();
  }

  res.status(200).send({
    message: 'Post image link updated',
  });
};
*/
