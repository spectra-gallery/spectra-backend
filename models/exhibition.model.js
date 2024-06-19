const mongoose = require('mongoose');

const Exhibition = mongoose.model(
    'Exhibition',
    new mongoose.Schema({
      name: {type: String, required: true},
      headline: {type: String, required: true},
      opening: {type: String},
      display: {type: Boolean, default: false},
      collectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collection',
      },
    }),
);

module.exports = Exhibition;
