const mongoose = require('mongoose');

const Fiat = mongoose.model(
    'Fiat',
    new mongoose.Schema({
      serieId: String,
      token: String,
      value: String,
      valid: {type: Boolean, default: false},
      used: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
    }),
);

module.exports = Fiat;
