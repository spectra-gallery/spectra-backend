const mongoose = require("mongoose");

const Theme = mongoose.model(
  "Theme",
  new mongoose.Schema({
    name: { type: String },
    description: String,
    mode: {
      type: String,
      enum: [
        "generative",
        "anarchist",
        "collective-intelligence",
        "subversive-art",
      ],
      default: "generative",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    public: { type: Boolean, default: true },
    personalize: { type: Boolean, default: false },
    layout: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Layout",
        },
    ],
    palette: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Palette",
      },
    ],
  })
);

module.exports = Theme;
