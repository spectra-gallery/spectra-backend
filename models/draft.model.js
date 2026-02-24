const mongoose = require('mongoose');

const Draft = mongoose.model(
  'Draft',
  new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
      key: { type: String, index: true },
      data: { type: mongoose.Schema.Types.Mixed },
      updatedAt: { type: Date, default: () => new Date() }
    },
    { timestamps: true }
  ).index({ userId: 1, key: 1 }, { unique: true })
);

module.exports = Draft;

