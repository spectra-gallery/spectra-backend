const mongoose = require('mongoose');

const Bluesky = mongoose.model(
    'Bluesky',
    new mongoose.Schema({
      id: String,
      username: String,
      displayName: String,
      token: String,
    }),
);

module.exports = Bluesky;
