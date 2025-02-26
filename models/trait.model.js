const mongoose = require('mongoose');

const Trait = mongoose.model(
    'Trait',
    new mongoose.Schema({
      trait_type: String,
      value: mongoose.Schema.Types.Mixed,
    }).pre('save', function (next) {
      
      this.trait_type = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
      
      if (typeof this.value === 'string') {
        this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1).toLowerCase();
      } 
      next();
    })
);



module.exports = Trait;
