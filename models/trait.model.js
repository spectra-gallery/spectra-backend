const mongoose = require('mongoose');

const Trait = mongoose.model(
    'Trait',
    new mongoose.Schema({
      trait_type: String,
      value: mongoose.Schema.Types.Mixed,
    }),
);

module.exports = Trait;
