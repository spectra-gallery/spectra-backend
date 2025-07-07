const mongoose = require('mongoose');

const UglifyJS = require('uglify-js');

const config = require("../config/auth.config");
const db = require("../models");

const Sketch = db.sketch;
const User = db.user;

const storageUpload = require('../middlewares/storageUpload');

exports.autoSaveSketch = async (req, res) => {

  const id = req.body.id;

  let sketch = null;

  if (id !== 'undefined' && isValidObjectId(id)) {
    sketch = await Sketch.findOne({
      _id: id
    });
  }

  if (!sketch) {
    // create new sketch
    const sketchData = new Sketch({
      html: req.body.html,
      css: req.body.css,
      javascript: req.body.javascript,
      hash: req.body.hash
    });
    sketchData.save()
      .then(data => {
        res.send({
          id: data._id
        });
      }).catch(err => {
        res.status(500).send({
          message: err.message || "Error Sketch"
        });
      });
  } else {
    // update sketch properties
    if (req.body.html) {
      sketch.html = req.body.html;
    }
    if (req.body.css) {
      sketch.css = req.body.css;
    }
    if (req.body.javascript) {
      sketch.javascript = req.body.javascript;
    }
    if (req.body.hash) {
      sketch.hash = req.body.hash;
    }
    await sketch.save();

    res.send({
      id: sketch._id
    });
  }
};

// generate new sketch id
exports.generateSketchId = async (req, res) => {

  const sketch = new Sketch({
    html: '',
    css: '',
    javascript: '',
    hash: ''
  });

  sketch.save()
    .then(data => {
      res.status(200).send({
        id: data._id
      });
    }).catch(err => {
      res.status(500).send({
        message: err.message || "Error Sketch"
      });
    });
};

// save sketch to user object
exports.saveSketch = async (req, res) => {

  const userId = req.userId;

  const id = req.body.id;

  const user = await User.findOne({
    _id: userId
  });

  if (!user) {
    return res.status(404).send({
      message: "User Not found."
    });
  }

  let sketch = null;

  if (id !== 'undefined' && isValidObjectId(id)) {
    sketch = await Sketch.findOne({
      _id: id
    });
  }

  // check if sketch already exists in user object
  if (!user.sketches.includes(sketch._id)) {
    user.sketches.push(sketch._id);
  }



  await user.save();


  res.status(200).send({
    id: userId,
    sketch: sketch
  });

};



function isValidObjectId(id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }
  return true;
}

// get sketch by id
exports.getSketchById = async (req, res) => {

  const id = req.params.id;

  const sketch = await Sketch.findOne({
    _id: id
  });

  if (!sketch) {
    return res.status(404).send({
      message: "Sketch Not found."
    });
  }

  res.status(200).send({
    id: sketch._id,
    html: sketch.html,
    css: sketch.css,
    javascript: sketch.javascript,
    hash: sketch.hash
  });
};

// get sketches by user id
exports.getSketchesByUserId = async (req, res) => {

  const userId = req.userId;

  const user = await User.findOne({ _id: userId }).populate('sketches');

  if (!user) {
    return res.status(404).send({
      message: "User Not found."
    });
  }

  const sketchArray = [];

  for (const sketch of user.sketches) {
    sketchArray.push({
      id: sketch._id,
      html: sketch.html,
      css: sketch.css,
      javascript: sketch.javascript,
      hash: sketch.hash
    });
  }
  res.status(200).send({
    sketches: sketchArray
  });

};

exports.minifyCode = async (req, res) => {

  const js = req.body.js;

  const minified = UglifyJS.minify(js);

  res.status(200).send({
    js: minified.code
  });

};

// delete sketch by id
exports.deleteSketchById = async (req, res) => {

  const id = req.params.id;

  const sketch = await Sketch.findOne({
    _id: id
  });

  if (!sketch) {
    return res.status(404).send({
      message: "Sketch Not found."
    });
  }

  await sketch.remove();

  res.status(200).send({
    message: "Sketch Deleted"
  });
}
