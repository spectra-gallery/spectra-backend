const mongoose = require("mongoose");

const Post = mongoose.model(
  "Post",
  new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String },
    subtitle: { type: String },
    description: { type: String, required: true },
    author: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
    display: { type: Boolean, default: true },
    like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    section: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
      },
    ],
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    date: { type: String, default: new Date().toISOString() },
    lastModified: { type: String },
    reviewed: { type: Boolean, default: false },
    reviewCount: { type: Number, default: 0 },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    // allowed collaborators to overview and edit the post
    allowed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    links: [String],
    references: [String],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  }).pre('save', function (next) {
    if (!this.slug && this.name) {
      this.slug = this.name.toLowerCase().replace(/ /g, "-");
    }
  
    this.lastModified = new Date().toISOString();
  
    // cannot be published without being reviewed
    if (!this.reviewed && this.published) {
      next(new Error('Post must be reviewed before publishing'));
    }
  
    // cannot be reviewd woith less than 3 reviews
    if (this.reviewCount < 3 && this.reviewed) {
      next(new Error('Post must have at least 3 reviews to be reviewed'));
    }
  
    // cannot be featured without being published
    if (!this.published && this.featured) {
      next(new Error('Post must be published before being featured'));
    }
    next();
  })
);


module.exports = Post;
