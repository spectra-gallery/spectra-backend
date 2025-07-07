const mongoose = require("mongoose");

const Session = mongoose.model(
  "Session",
  new mongoose.Schema({
    sessionId: { type: String, required: true },
    ip: [{ type: String }],
    date: { type: String, default: new Date().toISOString() },
    helpOff: { type: Boolean, default: false }
  })
);

module.exports = Session;
