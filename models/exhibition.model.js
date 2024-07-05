const mongoose = require('mongoose');

const Exhibition = mongoose.model(
    'Exhibition',
    new mongoose.Schema({
      name: {type: String, required: true},
      headline: {type: String, required: true},
      reviewed: {type: Boolean, default: false},
      reviewedBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      slug: {type: String},
      description: {type: String, required: true},
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
      reviewedDate: {type: String},
      opening: {type: String},
      closing: {type: String},
      display: {type: Boolean, default: false},
      series: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Serie',
        },
      ],
      palette: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Palette',
        },
      ],
      curators: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      likes: {type: Number, default: 0},
      date: {type: String, default: new Date().toISOString()},
      modified: {type: String, default: new Date().toISOString()},
      volume: {type: Number, default: 0},
    }),
);

module.exports = Exhibition;
