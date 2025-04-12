const mongoose = require("mongoose");
const { isHuman } = require("../services/monitorSession");

// Check for API abuse by monitoring user activity, metadata, request, and response
const Monitor = mongoose.model(
  "Monitor",
  new mongoose.Schema({
    flagged: {
      type: Boolean,
      default: false,
    },
    status: {
        type: String,
        default: "awaiting overview",
        enum: ["auto monitor", "awaiting overview", "processing", "resolved", "emergency"],
        },
    label: {
      type: String,
      default: "",
    },
    event_timestamp: {
      type: Date,
      default: new Date().toISOString(),
    },
    security_level: {
        type: Number,
        default: 0,
        enum: [0, 1, 2, 3],
    }, 
    auto_flag: {
        type: Boolean,
        default: false,
    },
    app_metric: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AppMetric",
        required: function() { return this.auto_flag; },
    },
 
    require_overview: {
      type: Boolean,
      default: false,
    },
    overview: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Overview",
        },
    ],
    number_of_require_overview: {
        type: Number,
        default: 0,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    n_failed_auth: {
      type: Number,
      default: 0,
    },
    payload_size: { type: Number, default: 0 },
    suscpicious_payload: { type: Boolean, default: false },
    payload_body: { type: String }

  }).pre("save", function (next) {
    next();
  })
);

module.exports = Monitor;
