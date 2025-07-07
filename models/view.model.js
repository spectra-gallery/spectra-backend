const { number } = require("bitcoinjs-lib/src/script");
const mongoose = require("mongoose");

const View = mongoose.model(
  "View",
  new mongoose.Schema({
    target: { type: String, required: true },
    session: { type: String, required: true },
    date: { type: String, default: new Date().toISOString() },
  })
);

module.exports = View;
