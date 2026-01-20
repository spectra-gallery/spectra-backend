const mongoose = require("mongoose");

const Word = mongoose.model(
  "Word",
  new mongoose.Schema({
    // word for world cloud
    name: String,
    // frequency of the word
    frequency: Number
  }).pre('save', function (next) {
    this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();

    if (!this.frequency) {
      this.frequency = Math.floor(Math.random() * 100);
    }
  
    next();
  })
);




module.exports = Word;