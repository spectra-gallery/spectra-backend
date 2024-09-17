const mongoose = require('mongoose');

const Auth = mongoose.model(
    'Auth',
    new mongoose.Schema({
      userId: {type: mongoose.Schema.Types.ObjectId,
        required: true, Ref: 'User'},
      date: {type: Date, default: Date.now},
      token: {type: String, default: '', trim: true, required: true},
    }),
);


module.exports = Auth;
