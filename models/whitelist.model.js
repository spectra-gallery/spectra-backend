const mongoose = require('mongoose');

const Whitelist = mongoose.model(
    'Whitelist',
    new mongoose.Schema({
      address: {type: String, required: true},
      value: {type: Number, required: true},
      used: {type: Boolean, default: false},
      paid: {type: Boolean, default: false},
      spots: {type: Number, default: 1},
      chain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chain',
      },
    }),
);

module.exports = Whitelist;
