const mongoose = require('mongoose');

const Buying = mongoose.model(
    'Buying',
    new mongoose.Schema({
      ordinalId: String,
      dummyTxHash: String,
      buyingTxHash: String,
      amount: String,
      dummyConfirmed: {type: Boolean, default: false},
      buyingConfirmed: {type: Boolean, default: false},
      valid: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }),
);

module.exports = Buying;
