const mongoose = require('mongoose');

const Gallery = mongoose.model(
    'Gallery',
    new mongoose.Schema({
      name: {type: String, required: true},
      description: {type: String, required: true},
      images: [{type: String, required: true}],
      exhibition: {type: Boolean, default: false},
      reviewed: {type: Boolean, default: false},
      collections: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Collection',
        },
      ],
      ordinals: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Ordinal',
        },
      ],
      artists: [
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
      views: {type: Number, default: 0},
      comment: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Comment',
        },
      ],
      date: {type: String, default: new Date().toISOString()},
      tag: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tag',
        },
      ],
    }),
);

Gallery.schema.pre('save', (next) => {
  const currentDate = new Date().toISOString();
  // eslint-disable-next-line no-invalid-this
  this.date = currentDate;
  next();
});

module.exports = Gallery;
