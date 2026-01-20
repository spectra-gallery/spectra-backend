const mongoose = require('mongoose');

const Telemetry = mongoose.model(
  'Telemetry',
  new mongoose.Schema(
    {
      sessionId: { type: String, index: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
      route: { type: String },
      event: { type: String, index: true },
      properties: { type: mongoose.Schema.Types.Mixed },
      userAgent: { type: String },
      ip: { type: String },
      ts: { type: Date, default: () => new Date() },
    },
    { timestamps: true }
  )
);

module.exports = Telemetry;

