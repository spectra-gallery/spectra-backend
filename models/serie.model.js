const mongoose = require('mongoose');
const db = require('../models');
const Sketch = db.sketch;
const Media = db.media;

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
      sketchSize: {type: Number},
      artists: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
        required: true
      },
      mediaSize: {type: Number},
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
      useIpfs: {type: Boolean, default: false},
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
      pixelArt: {type: Boolean, default: false},
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
    }).pre('save', function (next) {
      if (!this.slug && this.name) {
        this.slug = this.name.toLowerCase().replace(/ /g, "-");
      }
      // ensure there is a sketch if generative or interactive or audioBased or onChain
      if (this.generative || this.interactive || this.audioBased || this.onChain) {
        if (!this.sketch) {
          next(new Error('Serie must have a sketch'));
        }
      }
      // ensure there is a chain if onChain
      if (this.onChain) {
        if (!this.chain) {
          next(new Error('Serie must have a chain'));
        }
      }
      // update modifed if any change
      this.modified = new Date().toISOString();
    
      // if there is a sketch it has be type generative
      if (this.sketch) {
        if (this.type !== 'generative') {
          next(new Error('Sketch must be generative'));
        }
      } else {
        // if there is an image it has to be type mixmedia
        if (this.image && this.type !== 'mixmedia') {
          next(new Error('Image must be mixmedia'));
        }
      }
    
      // if the supply is is equal to the totalSupply then the serie is sold out
      if (this.supply === this.totalSupply) {
        this.onSale = false;
      }
    
      // if it onSale it has to be displayed
      if (this.onSale) {
        this.display = true;
      }
    
      // if it's mixmedia it cannot be onchain it has to be pixelArt
      if (this.type === 'mixmedia' && this.onChain) {
        if (!this.pixelArt) {
          next(new Error('Mixmedia cannot be onchain'));
        }
      }
      // if it's a sketch there has to be captureDelay
      if (this.sketch) {
        if (!this.captureDelay) {
          next(new Error('Serie must have a captureDelay'));
        }
      }
    
      // the name cannot be too long
      if (this.name && this.name.length > 20) {
        next(new Error("Name too long"));
      }
      if (this.subtite && this.subtitle.length > 60) {
        next(new Error("Headline too long"));
      }
    
      // if supply is different than elements length create an error
      if (this.supply !== this.elements.length) {
        next(new Error('Supply must be equal to elements length'));
      }
    
      // sketchSize is on chain and bigger than 4 mb on bitcoin
      if (this.sketchSize > 4000000 && this.onChain) {
        next(new Error('Sketch size must be less than 4mb'));
      }
    
      // if its' pixel it cannot be anything else than mixmedia
      if (this.pixelArt && this.type !== 'mixmedia') {
        next(new Error('Pixel art must be mixmedia'));
      }
    
      // cannot use ipfs and being on chain
      if (this.useIpfs && this.onChain) {
        next(new Error('Cannot use ipfs and be on chain'));
      }
    
      // cannot not use ipfs if type mixmedia and mediaSize is bigger than 4mb
      if (!this.useIpfs && this.type === 'mixmedia' && this.mediaSize > 4000000) {
        next(new Error('Media size must be less than 4mb'));
      }
      
      next();
    })
);



module.exports = Serie;
