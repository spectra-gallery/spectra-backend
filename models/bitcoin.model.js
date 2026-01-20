const mongoose = require('mongoose');

const Bitcoin = mongoose.model(
    'Bitcoin',
    new mongoose.Schema({
        cardinalAddress: String,
        ordinalAddress: String,
        cardinalPublicKey: String,
        ordinalPublicKey: String
    }),
);

module.exports = Bitcoin;
