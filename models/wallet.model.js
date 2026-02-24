const mongoose = require('mongoose');

const Wallet = mongoose.model(
    'Wallet',
    new mongoose.Schema({
      address: String,
      privateKey: {
        type: String,
        select: false,
      },
      publicKey: String,
      password: String,
      date: {type: String, default: new Date().toISOString()},
      volume: {type: Number, default: 0},
      txs: {type: Number, default: 0},
      assigned: {type: Boolean, default: false},
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

    }),
);

module.exports = Wallet;
