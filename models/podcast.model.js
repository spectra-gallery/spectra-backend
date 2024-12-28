const mongoose = require('mongoose');

const Podcast = mongoose.model(
    'Podcast',
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
      audioUrl: {type: String, required: true},
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      likes: {type: Number, default: 0},
      views: {type: Number, default: 0},
      date: {type: String, default: new Date().toISOString()},
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

module.exports = Podcast;
