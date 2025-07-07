const mongoose = require("mongoose");

const AppMetric = mongoose.model(
  "AppMetric",
  new mongoose.Schema({
    inter_api_access_duration: { type: Number, default: 0 },
    api_access_uniqueness: { type: Number, default: 0 },
    sequence_length: { type: Number, default: 0 },
    vsession_duration: { type: Number, default: 0 },
    ip_type: { type: Number, default: 0 },
    num_sessions: { type: Number, default: 0 },
    num_users: { type: Number, default: 0 },
    num_unique_apis: { type: Number, default: 0 },
    source: { type: Number, default: 0 }
  }).pre("save", function (next) {
    next();
  })
);

module.exports = AppMetric;
