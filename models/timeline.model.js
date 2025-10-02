const mongoose = require('mongoose');

const TimelineEvent = mongoose.model(
  'TimelineEvent',
  new mongoose.Schema(
    {
      label: { type: String, required: true },
      description: { type: String },
      category: { type: String, index: true },
      type: { type: String, default: 'point', index: true },
      medium: [{ type: String, index: true }],
      tags: [{ type: String, index: true }],
      source: { type: String },
      start: { type: Date, required: true, index: true },
      end: { type: Date, index: true },
      intensity: { type: Number, default: 0.5, min: 0, max: 1 },
      metadata: { type: mongoose.Schema.Types.Mixed },
      tribe: { type: mongoose.Schema.Types.ObjectId, ref: 'Tribe', index: true },
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
      reviewed: { type: Boolean, default: false }
    },
    { timestamps: true }
  )
);

// Text index for search
TimelineEvent.collection?.createIndex?.({ label: 'text', description: 'text', tags: 'text' });

module.exports = TimelineEvent;
