const mongoose = require('mongoose');

const Trait = mongoose.model(
  'Trait',
  new mongoose.Schema({
    trait_type: String,
    value: mongoose.Schema.Types.Mixed,
  }).pre('save', function (next) {
    // Normalize strings defensively
    if (typeof this.trait_type === 'string' && this.trait_type.length > 0) {
      const s = this.trait_type;
      this.trait_type = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }

    if (typeof this.value === 'string' && this.value.length > 0) {
      const v = this.value;
      this.value = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    }
    next();
  })
);



module.exports = Trait;
