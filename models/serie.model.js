const mongoose = require('mongoose');

const Serie = mongoose.model(
    'Serie',
    new mongoose.Schema({
      name: {type: String, required: true},
      slug: {type: String},
      subtitle: {type: String},
      description: {type: String, required: true},
      image: {type: String, required: true},
      type: {type: String, default: 'mixmedia'},
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
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
      captureDelay: {type: Number, default: 5000},
      cssSelector: {type: String, default: 'body'},
      backgroundColor: {type: String, default: '#F2F0EC'},
      chain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chain',
      },
      elements: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Element',
        }
      ],
      onChain: {type: Boolean, default: false},
      onSale: {type: Boolean, default: false},
      display: {type: Boolean, default: true},
      supply: {type: Number, default: 0},
      totalSupply: {type: Number},
      price: {type: Number, default: 0},
      priceUSD: {type: Number, default: 0},
      royalty: {type: Number, default: 0},
      volume: {type: Number, default: 0},
      volumeUSD: {type: Number, default: 0},
      rank: {type: Number, default: 0},
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      likes: {type: Number, default: 0},
      views: {type: Number, default: 0},
      date: {type: String, default: new Date().toISOString()},
      modified: {type: String},
      reviewed: {type: Boolean, default: false},
      published: {type: Boolean, default: false},
      publishHash: {type: String},
      projectId: {type: String},
      category: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      trait: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Trait',
        },
      ],
      generative: {type: Boolean, default: false},
      interactive: {type: Boolean, default: false},
      audioBased: {type: Boolean, default: false},
      link: {type: String},
      whitelist: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Whitelist',
        },
      ],
    }),
);

module.exports = Serie;
