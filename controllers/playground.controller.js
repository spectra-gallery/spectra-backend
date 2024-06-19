const mongoose = require('mongoose');

const config = require("../config/auth.config");
const db = require("../models");

const Sketch = db.sketch;

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
