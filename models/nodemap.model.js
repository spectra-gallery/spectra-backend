const mongoose = require('mongoose');

const Nodemap = mongoose.model(
    'Nodemap',
    new mongoose.Schema({
      name: String,
    }),
);

module.exports = Nodemap;
