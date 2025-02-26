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
    }).pre('save', function (next) {
      if (this.columns === 1) {
        // constrain the columnData to one element overlay and full ratio
        this.columnData = [
          {
            item: 'overlay',
            ratio: 'full'
          }
        ];
      }
      // full 100%
        // extreme 100/1.618 = 61.8%
        // mean 100/1.618^2 = 38.2%
        // extreme-mean 38.2% / 1.618 = 23.6%
        // mean-extreme 23.6% / 1.618 = 38.2%
        // ensure the the combined ratio is 100% depending on the columnData and the number of columns
        // ensure one of the item alway as at least and image
      if (this.columns === 2) {
        // constrain the columnData to two elements overlay and full ratio
        this.columnData = [
          {
          
            ratio: 'extreme'
          },
          {
            
            ratio: 'mean'
          }
        ];
      } else if (this.columns === 3) {
        // constrain the columnData to three elements overlay and full ratio
        this.columnData = [
          {
           
            ratio: 'extreme'
          },
          {
         
            ratio: 'mean'
          },
          {
           
            ratio: 'extreme-mean'
          }
        ];
      } else if (this.columns === 4) {
        // constrain the columnData to four elements overlay and full ratio
        this.columnData = [
          {
           
            ratio: 'extreme'
          },
          {
        
            ratio: 'mean'
          },
          {
         
            ratio: 'extreme-mean'
          },
          {
        
            ratio: 'mean-extreme'
          }
        ];
      }
      
        
    
      
      next();
    })
);



module.exports = Section;
