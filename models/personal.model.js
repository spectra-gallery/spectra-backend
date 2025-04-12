const mongoose = require('mongoose');

const Personal = mongoose.model(
    'Personal',
    new mongoose.Schema({
        age: {type: Number },
        age_verified: {
            type: Boolean,
            default: false
        },
        
    }).pre('save', function (next) {
       
        next();
      })
);

module.exports = Personal;
