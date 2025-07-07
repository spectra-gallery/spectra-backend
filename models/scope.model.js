const mongoose = require('mongoose');

const Scope = mongoose.model(
    'Scope',
    new mongoose.Schema({
      title: {type: String, default: '', trim: true},
      content: {type: String, default: '', trim: true, required: true},
      medias: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Media',
        },
      ]
    }),
);



module.exports = Scope;
