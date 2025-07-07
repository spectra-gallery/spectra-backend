const mongoose = require('mongoose');

const Bid = mongoose.model(
    'Bid',
    new mongoose.Schema({
      tokenId: {type: String},
      buyingTxHash: {type: String},
      bidderOrdinalAddress: {type: String},
      amount: {type: String},
      signedBiddigPSBTBase64: {type: String},
      dummyTxHash: {type: String},
      dummyConfirmed: {type: Boolean, default: false},
      valid: {type: Boolean, default: false},
      isAccepted: {type: Boolean, default: false},
      isConfirmed: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
    }),
);

module.exports = Bid;
