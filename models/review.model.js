const mongoose = require("mongoose");

const Review = mongoose.model(
  "Review",
  new mongoose.Schema({
    reviewed: { type: Boolean, default: false },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewDate: { type: Date, default: Date.now },
    reviewComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    reviewRating: { type: Number, min: 0, max: 5 },
    spectrum: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Spectrum",
      },
    ],
  }).pre('save', function (next) {
    
    
    next();
  })
);


  

module.exports = Review;
