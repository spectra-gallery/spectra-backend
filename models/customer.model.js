const mongoose = require('mongoose');

const Customer = mongoose.model(
    'Customer',
    new mongoose.Schema({
        userId: String,
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        zip: String,
        country: String,
        email: String,
    }).pre('save', function (next) {
       // address validation
  
      
      
        next();
      })
);

module.exports = Customer;
