const config = require("../config/auth.config");
const db = require("../models");
const mail = require("../middlewares/mail");
const User = db.user;
const Article = db.article;
const Section = db.section;
const Comment = db.comment;
const Footprint = db.footprint;
const Category = db.category;

const loginController = require('./auth.controller');

var jwt = require("jsonwebtoken");

exports.fetchArticles = () => {
  let promise = new Promise((resolve, reject) => {
    Article.find({}).populate("section", "-__v")
    .populate("comment", "-__v")
    .exec((err, articles) => {
      resolve(articles);
      if (err) reject();
    });
  });
  return promise;
}

exports.fetchArticle = (req, res) => {
  let promise = new Promise((resolve, reject) => {
    Article.findById(req.params.id).exec((err, article) => {
      const articleObj = {
        id: article._id,
        title: article._doc.title,
        section: article._doc.section,
        category: article._doc.category,
        imageUrl: article._doc.imageUrl, 
        author: article._doc.author,
        date: article._doc.date
      }
      resolve(articleObj);
      if (err) reject();
    });
  });
  return promise;
}

exports.fetchCategory = () => {
  let promise = new Promise((resolve, reject) => {
    Category.find({}).exec((err, categories) => {
      resolve(categories);
      if (err) reject();
    });
  });
  return promise;
}

exports.createArticle = (req, res) => {
  if (!req.body.title || !req.body.section) {
    return res.status(400).send({
      message: "Fields cannot be empty"
    });
  }
  //const loggedInUser = loginController.getLoggedInUserObject(req, res);

  const article = new Article({
    title: req.body.title,
    section: req.body.section,
    author: req.username,
    category: req.body.category,
    imageUrl: req.body.imageUrl
  });
  article.save()
  .then(data => {
    res.send(data);
  }).catch(err => {
    res.status(500).send({
      message: err.message || "Error Article"
    });
  });

  const categorytArray = req.body.category;

  categorytArray.map(async cat => {

        let element = await Category.findOne({
          name: cat
        });


        if (!element) {

          const category = new Category({
            name: cat
          });
          category.save()
            .then(data => {
              //res.send(data);
            }).catch(err => {
              res.status(500).send({
                message: err.message || "Error Category"
              });
            });

        }

      });

  const options = mail.getMailOptions('pmosi76@gmail.com', req, 'content');


  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}

exports.createSection = (req, res) => {
  if (!req.body.title || !req.body.content) {
    return res.status(400).send({
      message: "Section Fields cannot be empty"
    });
  }
  //const loggedInUser = loginController.getLoggedInUserObject(req, res);

  const section = new Section({
    title: req.body.title,
    content: req.body.content,
    imageUrl: req.body.imageUrl
  });
  section.save()
  .then(data => {
    res.send({
      id: data._id
    });
  }).catch(err => {
    res.status(500).send({
      message: err.message || "Error Section"
    });
  });

}
// Retrieve and return section by id from the database.
exports.fetchSection = (req, res) => {
  Section.findById(req.params.id).exec((err, section) => {
    const sectionObj = {
      id: section._id,
      title: section._doc.title,
      content: section._doc.content,
      imageUrl: section._doc.imageUrl
    }
    res.send(sectionObj);
    if (err) {
      return res.status(500).send({
        message: "Error retrieving section with id " + req.params.id
      });
    }
  });
};

// Retrieve and return all sections from article by id from the database.
exports.fetchSections = (req, res) => {
  Article.findById(req.params.id).populate("section", "-__v")
  .exec((err, article) => {
    res.send(article.section);
    if (err) {
      return res.status(500).send({
        message: "Error retrieving sections with id " + req.params.id
      });
    }
  });
};

// edit section
exports.editSection = (req, res) => {
  if (!req.body.title || !req.body.content) {
    return res.status(400).send({
      message: "Section Fields cannot be empty"
    });
  }

  Section.findByIdAndUpdate(req.params.id, {

    title: req.body.title,
    content: req.body.content,
    imageUrl: req.body.imageUrl

  }, {
    new: true
  }).then(section => {
    if (!section) {
      return res.status(404).send({
        message: "Section not found with id " + req.params.id
      });
    }
    res.send({
      id: section._id
    });

  }).catch(err => {
    if (err.kind === 'ObjectId') {
      return res.status(404).send({
        message: "Section not found with id " + req.params.id
      });
    }
    return res.status(500).send({
      message: "Error updating section with id " + req.params.id
    });
  
  });
};

exports.commentArticle = (req, res) => {

  const articleId = req.params.id;

  const comment = new Comment({
    content: req.body.content,
    author: req.username
  });
  comment.save()
  .then(data => {

    addComment(data._id);
    res.send({
      id: data._id,
      articleId: articleId,
      content: data.content,
      author: data.author,
      date: data.date
    });


  }).catch(err => {
    res.status(500).send({
      message: err.message || "Error creating comment"
    });
  });

  addComment = (id) => {

    Article.findById(req.params.id)
    .then(article => {
      if(!article) {
        return res.status(404).send({
            message: "Article not found"
        });
      }
      article.comment.push(id);
      article.save();

      //res.send({});
    }).catch(err => {
       
      return res.status(500).send({
        message: "Error saving comment"
      });
    });

  }
  
};

exports.likeArticle = (req, res) => {

  Article.findById(req.params.id)
  .then(article => {
    if(!article) {
      return res.status(404).send({
          message: "Article not found"
      });
    }

    const like = article.like;
    let likes = article.likes;
    const username = req.username;

    if (like.some(item => item === username)) {
      const index = like.indexOf(username);
      if (index > -1) {
        like.splice(index, 1);
        if (likes > 0) likes -=1
      }

    } else {
      like.push(username);
      likes += 1
    }

    article.like = like;
    article.likes = likes;
    article.save();

    res.send({
      id: req.params.id,
      like: article.like,
      likes: article.likes
    });

    //res.send({});
  }).catch(err => {
     
    return res.status(500).send({
      message: "Error liking article"
    });
  });
 
};

exports.editArticle = (req, res) => {

  Article.findByIdAndUpdate(req.params.id, {
    title: req.body.title,
    section: req.body.section,
    category: req.body.category,
    imageUrl: req.body.imageUrl
  }, {new: true})
  .then(article => {
    if(!article) {
      return res.status(404).send({
          message: "Article not found"
      });
    }

    const categoryArray = article.category;

    categoryArray.map(async cat => {

      let element = await Category.findOne({
        name: cat
      });

        
      if (!element) {

      const category = new Category({
        name: cat
      });
      category.save()
      .then(data => {
        //res.send(data);
      }).catch(err => {
        res.status(500).send({
          message: err.message || "Error Category"
        });
      });

    }   
    
    });

    res.send({
      id: article._id,
      title: article.title,
      section: article.section,
      category: article.category,
      imageUrl: article.imageUrl
    });

    //res.send({});
  }).catch(err => {
     
    return res.status(500).send({
      message: "Error editing article"
    });
  });
 
};

exports.deleteArticle = (req, res) => {
  
  Article.findByIdAndRemove(req.params.id)
  .then(article => {
    if (!article) {
      return res.status(404).send({
        message: "Article not found id " + req.params.id
      });
    }
    res.send({message: "Article deleted"});
  }).catch(err => {
    if(err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: "Article not found id " + req.params.id
      });                
    }
    return res.status(500).send({
      message: "Article not delete id " + req.params.id
    });
  })
}

exports.deleteCategory = (req, res) => {
  
  Category.findByIdAndRemove(req.params.id)
  .then(category => {
    if (!category) {
      return res.status(404).send({
        message: "Category not found id " + req.params.id
      });
    }
    res.send({message: "Category deleted"});
  }).catch(err => {
    if(err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: "Category not found id " + req.params.id
      });                
    }
    return res.status(500).send({
      message: "Category not delete id " + req.params.id
    });
  })
}