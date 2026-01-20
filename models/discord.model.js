const mongoose = require('mongoose');

const Discord = mongoose.model(
    'Discord',
    new mongoose.Schema({
      id: String,
      username: String,
    }),
);

module.exports = Discord;
