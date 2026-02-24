const mongoose = require("mongoose");

const crypto = require("crypto");


const Credential = mongoose.model(
  "Credential",
  new mongoose.Schema({
    // the credential id
    credId: {
      type: String,
      default: crypto.randomBytes(20).toString("hex"),
      unique: true,
    },

    // the credential public key
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      default: 0,
    }
  })
);

module.exports = Credential;
