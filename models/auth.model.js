const mongoose = require('mongoose');
const crypto = require('crypto');
const Auth = mongoose.model(
    'Auth',
    new mongoose.Schema({
      userId: {type: mongoose.Schema.Types.ObjectId,
        required: true, Ref: 'User'},
      date: {type: Date, default: Date.now},
      token: {type: String, default: '', trim: true, required: true, default: crypto.randomBytes(20).toString('hex')},
    }),
   
);


module.exports = Auth;
