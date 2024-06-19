const mongoose = require("mongoose");

const Sketch = mongoose.model(
  "Sketch",
  new mongoose.Schema({
    html: {type: String},
    css: {type: String},
    javascript: {type: String},
    hash: {type: String},
    date: {type: Date, default: new Date().toISOString()},
  })
);


module.exports = Sketch;