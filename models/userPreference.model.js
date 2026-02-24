const mongoose = require("mongoose");

const UserPreference = mongoose.model(
  "UserPreference",
  new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    theme: {
      type: String,
      enum: ["default", "arty", "minimalist", "golden-ratio"],
      default: "default"
    },
    layoutStyle: {
      type: String,
      enum: ["standard", "golden-ratio-grid", "minimalist-grid"],
      default: "standard"
    },
    typography: {
      type: String,
      enum: ["standard", "big-titles", "compact"],
      default: "standard"
    },
    colorScheme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system"
    },
    showAdvancedOptions: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }, {
    timestamps: true
  })
);

module.exports = UserPreference;