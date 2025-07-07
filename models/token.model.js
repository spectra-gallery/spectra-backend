const mongoose = require('mongoose');

const Token = mongoose.model(
    'Token',
    new mongoose.Schema({
      userId: {type: mongoose.Schema.Types.ObjectId,
        required: true, Ref: 'User'},
      date: {type: Date, default: Date.now},
      updated: {type: Date},
      token: {type: String, default: '', trim: true, required: true},
    }).pre('save', function (next) {
        this.updated = Date.now();
        next();
      })
);


module.exports = Token;
