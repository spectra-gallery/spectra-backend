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
      shippingProductCode: String,
      shippingProductName: String,
      shippingCurrency: String,
      format: String,
      weight: Number,
      status: {type: String, default: 'pending', enum: ['pending', 'paid', 'generated', 'delivered']},
      date: {type: String, default: new Date().toISOString()},
      modified: {type: String},
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        select: false
      },
    }).pre('save', function (next) {
      this.modified = new Date().toISOString();
        next();
      })
);

module.exports = Order;
