const mongoose = require('mongoose');

const Apply = mongoose.model(
    'Apply',
    new mongoose.Schema({
      type: {type: String},
      about: {type: String, required: true},
      links: [String],
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      date: {type: String, default: new Date().toISOString()},
      granted: {type: Boolean, default: false},
      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {type: String, default: 'pending'},
    }),
);

module.exports = Apply;
