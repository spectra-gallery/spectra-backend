const mongoose = require("mongoose");

const Spectrum = mongoose.model(
  "Spectrum",
  new mongoose.Schema({
    name: { type: String, enum: ["atypique", "critical", "subversive", "abstract", "creative", "anarchist", "activist", "humanist", "collectiveIntelligence", "biaised"], required: true },
    value: { type: Number, default: 0, min: 0, max: 100 },
    
  })
);

module.exports = Spectrum;
