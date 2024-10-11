const mongoose = require('mongoose');

const Post = mongoose.model(
    'Post',
    new mongoose.Schema({
      name: {type: String, required: true},
      slug: {type: String},
      subtitle: {type: String},
      description: {type: String, required: true},
      author: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
      display: {type: Boolean, default: true},
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      section: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Section',
        },
      ],
      likes: {type: Number, default: 0},
      views: {type: Number, default: 0},
      date: {type: String, default: new Date().toISOString()},
      lastModified: {type: String},
      reviewed: {type: Boolean, default: false},
      reviewDate: {type: String},
      reviewedBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      published: {type: Boolean, default: false},
      featured: {type: Boolean, default: false},
      category: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      links: [String],
      references: [String],
      comments: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Comment',
        },
      ],
    }),
);

module.exports = Post;
