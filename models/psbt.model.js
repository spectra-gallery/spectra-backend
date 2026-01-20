const mongoose = require('mongoose');

const Psbt = mongoose.model(
    'Psbt',
    new mongoose.Schema({
      tokenId: {type: String},
      signedListingPSBTBase64: {type: String},
      signedBuyingPSBTBase64: {type: String},
      paymentAddress: {type: String},
      publicKey: {type: String},
      date: {type: String, default: new Date().toISOString()},
    }),
);

module.exports = Psbt;
