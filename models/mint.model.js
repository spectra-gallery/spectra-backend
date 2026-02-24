const mongoose = require('mongoose');

const Mint = mongoose.model(
    'Mint',
    new mongoose.Schema({
      txHash: String,
      tokenId: String,
      collectionId: String,
      amount: String,
      address: String,
      valid: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
    }),
);

module.exports = Mint;
