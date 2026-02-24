const mongoose = require("mongoose");
const { critique } = require(".");

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
    nuance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nuance",
    },
    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false }
  }).pre('save', function (next) {
    if (!this.slug && this.name) {
      this.slug = this.name.toLowerCase().replace(/ /g, "-");
  
      this.lastModified = new Date().toISOString();
  
      // cannot be featured if not publishded and displayed
      if ((!this.published || !this.display) && this.featured) {
        next(new Error("Cannot feature an unpublished or undisplayed portfolio"));
      }

      // if published, must be reviewed
      if (this.published && !this.reviewed) {
        next(new Error("Portfolio must be reviewed before publishing"));
      }
  
      // the name cannot be too long
    if (this.name && this.name.length > 20) {
      next(new Error("Name too long"));
    }
    if (this.subtitle && this.subtitle.length > 60) {
      next(new Error("Headline too long"));
    }
    }
    next();
  })
);



module.exports = Portfolio;
