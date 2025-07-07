const mongoose = require('mongoose');

const Chain = mongoose.model(
    'Chain',
    new mongoose.Schema({
        name: String,
        address: String

    }),
);

module.exports = Chain;
