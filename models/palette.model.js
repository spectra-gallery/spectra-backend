const mongoose = require('mongoose');

const Palette = mongoose.model(
    'Palette',
    new mongoose.Schema({
      hex: String,
    }),
);

module.exports = Palette;
