const mongoose = require("mongoose");

const Palette = mongoose.model(
  "Palette",
  new mongoose.Schema({
    name: String,
    hex: String,
  }).pre('save', function (next) {
    // check the format of the hex is valid using regex
    // if not, throw an error
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(this.hex)) {
      throw new Error('Invalid hex format');
    }
  
    next();
  })
);


module.exports = Palette;
