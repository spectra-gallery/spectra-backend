const mongoose = require('mongoose');
const { element } = require('.');

const Order = mongoose.model(
    'Order',
    new mongoose.Schema({
      serieId: String,
      elementId: String,
      identifier: String,
      artworkValue: Number,
      printValue: Number,
      transportValue: Number,
      transportationDays: Number,
      deliveryDate: String,
      format: String,
      weight: Number,
      paid: {type: Boolean, default: false},
      generated: {type: Boolean, default: false},
      delivered: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
    }),
);

module.exports = Order;
