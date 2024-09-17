const mongoose = require('mongoose');

const Comment = mongoose.model(
    'Section',
    new mongoose.Schema({
      title: {type: String, default: '', trim: true},
      content: {type: String, default: '', trim: true, required: true},
      imageUrl: {type: String},
    }),
);

module.exports = Comment;
