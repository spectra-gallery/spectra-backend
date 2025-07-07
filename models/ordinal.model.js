const mongoose = require('mongoose');

const Ordinal = mongoose.model(
    'Ordinal',
    new mongoose.Schema({
      id: {type: String, required: true},
      inscription_number: {type: String, required: true},
      address: {type: String, required: true},
      content: {type: String, required: true},
      preview: {type: String, required: true},
      content_type: {type: String, required: true},
      content_length: {type: String, required: true},
      sat: {type: String, required: true},
      timestamp: {type: String, required: true},
      genesisTransaction: {type: String},
      genesisTransactionBlockTime: {type: String},
      location: {type: String},
      output: {type: String},
      outputValue: {type: String},
      satName: {type: String},
      display: {type: Boolean, default: false},
      onSale: {type: Boolean, default: false},
      bid: {type: Boolean, default: false},
      price: {type: String, default: '0'},
    }),
);

module.exports = Ordinal;
