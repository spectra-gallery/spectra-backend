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
    }),
);

module.exports = Customer;
