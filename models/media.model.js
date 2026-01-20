const mongoose = require('mongoose');

const Media = mongoose.model(
    'Media',
    new mongoose.Schema({
        url: String,
        width: Number,
        height: Number,
        ratio: String,
        type: String,
        origin: String,
        mediaSize: {type: Number, default: 0},
    }),
);


module.exports = Media;
