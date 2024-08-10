const mongoose = require('mongoose');

const Payment = mongoose.model(
    'Payment',
    new mongoose.Schema({
      valueSatoshi: Number,
      satPrice: Number,
      serviceFees: Number,
      platformFees: Number,
      autoPayFees: Number,
      address: String,
      txHash: String,
      amount: Number,
      valid: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
    }),
);

module.exports = Payment;
