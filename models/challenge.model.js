const mongoose = require("mongoose");

const crypto = require("crypto");
// 2FA yubikey Fido challenge

const Challenge = mongoose.model(
  "Challenge",
  new mongoose.Schema({
    data: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    issued: {
      type: Date,
      default: new Date().toISOString(),
      index: { expires: "1m" }
    }
  }).pre('save', function (next) {
 
    next();
  })
);

module.exports = Challenge;
