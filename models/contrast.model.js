const mongoose = require("mongoose");

const Contrast = mongoose.model(
  "Contrast",
  new mongoose.Schema({
    // contrast according to the color theory of Johannes Itten
    hot_cold: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ],
    light_dark: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ],
    complementary: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ],
    simultaneous: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ],
    saturation: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ],
    extension: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ],
    harmony: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Palette",
        }
    ]
  })
);

module.exports = Contrast;
