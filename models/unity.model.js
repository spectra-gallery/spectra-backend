const mongoose = require("mongoose");
const crypto = require("crypto");

const Unity = mongoose.model(
  "Unity",
  new mongoose.Schema({

    role: {type: String, 
        enum: ["indivudal human", "generative script", "algorithmic automation", "tribe", "nested cluster", "digital agent", "perceptron", "smart contract", "external api"], 
        unique: true,
        required: true
    },
    hash: {type: String, required: true, select: false},
    
  }).pre('save', function (next) {
    
    if (!this.hash) {
        this.hash = crypto.randomBytes(20).toString('hex');
    }
    
    next();
  })
);


  

module.exports = Unity;
