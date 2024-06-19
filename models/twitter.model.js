const mongoose = require('mongoose');

const Twitter = mongoose.model(
    'Twitter',
    new mongoose.Schema({
      id: String,
      username: String,
      displayName: String,
      token: String,
    }),
);

module.exports = Twitter;
