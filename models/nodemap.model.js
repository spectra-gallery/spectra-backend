const mongoose = require('mongoose');

const Nodemap = mongoose.model(
    'Nodemap',
    new mongoose.Schema({
      name: String,
    }).pre('save', function (next) {
      this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
      
      next();
    })
);

module.exports = Nodemap;
