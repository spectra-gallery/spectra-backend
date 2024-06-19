const mongoose = require('mongoose');

const Comment = mongoose.model(
    'Comment',
    new mongoose.Schema({
      id: String,
      content: {type: String, default: '', trim: true, required: true},
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      date: {type: Date, default: Date.now},
    }),
);


module.exports = Comment;
