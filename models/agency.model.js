const mongoose = require("mongoose");

const Agency = mongoose.model(
  "Agency",
  new mongoose.Schema({
    // define the actions allowed for the user or entity
    name: {type: String, default: '', trim: true},
    token: {type: String, required: true, select: false}

  }).pre('save', function (next) {
    
    
    next();
  })
);


  

module.exports = Agency;
