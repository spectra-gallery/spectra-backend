const mongoose = require("mongoose");

const Tag = mongoose.model(
  "Tag",
  new mongoose.Schema({
    name: String
  }).pre('save', function (next) {
    // check if name first letter is uppercase and the rest is lowercase
    // if not, convert it
    this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
    next();
  })
);




module.exports = Tag;