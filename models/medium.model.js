const mongoose = require('mongoose');

const Medium = mongoose.model(
    'Medium',
    new mongoose.Schema({
      name: String,
    }),
);

module.exports = Medium;
