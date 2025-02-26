const mongoose = require("mongoose");
const { wordCloud } = require("../config/dataviz.config");

const Dataviz = mongoose.model(
  "Dataviz",
  new mongoose.Schema({
    wordCloud: {
      trace: { type: String, default: wordCloud.trace },
      spiralResolution: { type: Number, default: wordCloud.spiralResolution },
      spiralLimit: { type: Number, default: wordCloud.spiralLimit },
      lineHeight: { type: Number, default: wordCloud.lineHeight },
      xWordPadding: { type: Number, default: wordCloud.xWordPadding },
      yWordPadding: { type: Number, default: wordCloud.yWordPadding },
      freqRatio: { type: Number, default: wordCloud.freqRatio },
      font: { type: String, default: wordCloud.font },
    },
  })
);

module.exports = Dataviz;
