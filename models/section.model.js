const mongoose = require('mongoose');
const { bool } = require('sharp');

const Section = mongoose.model(
    'Section',
    new mongoose.Schema({
      title: {type: String, default: '', trim: true},
      content: {type: String, default: '', trim: true, required: true},
      imageUrl: {type: String},
      auto: {type: Boolean, default: false},
      columns: {type: Number, enum: [1, 2, 3, 4], default: 2},
      columnData: [ 
        {
          item: {type: String, enum: ['title-content', 'title', 'content', 'image', 'overlay']},
          // golden ratio proportion
          ratio: {type: String, enum: ['full', 'extreme', 'extreme-mean', 'mean', 'mean-extreme']}
        }
      ]
    }),
);

module.exports = Section;
