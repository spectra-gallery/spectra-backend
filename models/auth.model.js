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

Auth.schema.pre('save', (next) => {
  const currentDate = new Date().toISOString();
  // eslint-disable-next-line no-invalid-this
  this.date = currentDate;
  next();
});

module.exports = Auth;
