const mongoose = require('mongoose');

const Provenance = mongoose.model(
  'Provenance',
  new mongoose.Schema({
    actor: { type: String },
    action: { type: String },
    input: { type: Object },
    output: { type: Object },
    tags: { type: [String], default: [] },
    risk: { type: String },
    date: { type: String, default: () => new Date().toISOString() }
  })
);

module.exports = Provenance;

