const mongoose = require('mongoose');

const Transaction = mongoose.model(
    'Transaction',
    new mongoose.Schema({
      txHash: String,
      token: String,
      value: String,
      valid: {type: Boolean, default: false},
      used: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
    }),
);

module.exports = Transaction;
