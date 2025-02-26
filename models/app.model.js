const mongoose = require("mongoose");
const { version, github, status } = require("../config/app.config");

const App = mongoose.model(
  "App",
  new mongoose.Schema({
    version: { type: String, default: version },
    github: { type: String, default: github },
    status: { type: String, default: status },
    frequentWord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Word",
    },
    theme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
    },
  })
);

module.exports = App;
