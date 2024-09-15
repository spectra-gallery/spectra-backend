const mongoose = require("mongoose");

const Article = mongoose.model(
  "Article",
  new mongoose.Schema({
    title: {type: String, default:'', trim: true, required: true},
    section: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section"
      }
    ],
    author: {type: String, required: true},
    imageUrl: {type: String, required: true},
    category: [
      {
        type: [String], // mongoose.Schema.Types.ObjectId
        ref: "Category"
      }
    ],
    date: {type: Date, default: Date.now},
    like: {type: [String], defautl: ''},
    likes: {type: Number, default: 0},
    comment: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
      }
    ]
  })
);

module.exports = Article;