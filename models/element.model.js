const mongoose = require('mongoose');

const Element = mongoose.model(
    'Element',
    new mongoose.Schema({
      name: {type: String, required: true},
      subtitle: {type: String},
      slug: {type: String},
      tokenId: {type: String},
      iteration: {type: Number, required: true},
      description: {type: String, required: true},
      address: {type: String},
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
      sketch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sketch',
      },
      artists: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      serieRef: {type: String},
      attributes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Attribute',
        },
      ],
      onSale: {type: Boolean, default: false},
      onChain: {type: Boolean, default: false},
      royalty: {type: String},
      views: {type: Number, default: 0},
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      likes: {type: Number, default: 0},
      chain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chain',
      },
      date: {type: String, default: new Date().toISOString()},
      lastTx: {type: String, default: new Date().toISOString()},
      link: {type: String},
    }),
);

module.exports = Element;
