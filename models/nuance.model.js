const mongoose = require("mongoose");

const Nuance = mongoose.model(
  "Nuance",
  new mongoose.Schema({
    blossoming: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ],
    emancipation: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ],
    critique: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ],
    tension: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ],
    meditation: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ],
    substance: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ],
    humour: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contrast",
        }
    ]
  })
);

module.exports = Nuance;
