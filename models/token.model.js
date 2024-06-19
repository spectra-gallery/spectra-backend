const mongoose = require('mongoose');

const Token = mongoose.model(
    'Token',
    new mongoose.Schema({
      userId: {type: mongoose.Schema.Types.ObjectId,
        required: true, Ref: 'User'},
      date: {type: Date, default: Date.now},
      token: {type: String, default: '', trim: true, required: true},
    }),
);


module.exports = Token;
