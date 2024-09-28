const mongoose = require("mongoose");

const Portfolio = mongoose.model(
  "Portfolio",
  new mongoose.Schema({
    slug: { type: String },
    name: { type: String, default: "", trim: true, required: true },
    subtitle: { type: String },
    description: { type: String, default: "", trim: true, required: true },
    authors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    medias: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    scopes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scope",
      },
    ],
    tag: [
      {
        type: [String], // mongoose.Schema.Types.ObjectId
        ref: "Tag",
      },
    ],
    date: { type: Date, default: Date.now },
    lastModified: { type: String },
    reviewed: { type: Boolean, default: false },
    display: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    like: { type: [String], defautl: "" },
    likes: { type: Number, default: 0 },
    comment: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    links: [String],
    references: [String],
  })
);

module.exports = Portfolio;
