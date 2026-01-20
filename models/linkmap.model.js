const mongoose = require("mongoose");

const Linkmap = mongoose.model(
  "Linkmap",
  new mongoose.Schema({
    source: { type: String, default: "" },
    label: { type: String, default: "" },
    target: { type: String, default: "" },
  })
);

module.exports = Linkmap;
