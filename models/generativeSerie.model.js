const mongoose = require('mongoose');
const db = require('../models');
const Serie = db.serie;

const GenerativeSerie = mongoose.model(
    'GenerativeSerie',
    new mongoose.Schema({
      // Base serie properties
      name: {type: String, required: true},
      slug: {type: String},
      subtitle: {type: String},
      description: {type: String, required: true},
      image: {type: String, required: true},
      type: {type: String, default: 'generative'},
      
      // Generative-specific properties
      algorithm: {type: String, required: true}, // e.g., 'diffusion', 'differential-growth', 'noise-based'
      parameters: {type: Object, default: {}}, // Algorithm parameters
      seed: {type: String, default: ''}, // Random seed for reproducibility
      palette: {type: Array, default: []}, // Color palette used
      
      // Technical properties
      sketchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sketch',
      },
      sketchSize: {type: Number, default: 1000},
      captureDelay: {type: Number, default: 5000},
      cssSelector: {type: String, default: 'body'},
      backgroundColor: {type: String, default: '#F2F0EC'},
      
      // Artistic properties
      style: {type: String, default: 'abstract'}, // e.g., 'abstract', 'geometric', 'organic'
      complexity: {type: Number, min: 1, max: 10, default: 5}, // Complexity level
      iterations: {type: Number, default: 100}, // Number of iterations
      
      // Audio properties (if audio-based)
      audioBased: {type: Boolean, default: false},
      audioAlgorithm: {type: String}, // e.g., 'FM-synthesis', 'granular', 'waveform'
      audioParameters: {type: Object, default: {}},
      
      // Blockchain properties
      chain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chain',
      },
      onChain: {type: Boolean, default: false},
      contractAddress: {type: String},
      tokenStandard: {type: String, enum: ['ERC721', 'ERC1155', 'BTC-Ordinals']},
      
      // Collection properties
      totalSupply: {type: Number, default: 100},
      supply: {type: Number, default: 0},
      onSale: {type: Boolean, default: false},
      price: {type: Number, default: 0},
      priceUSD: {type: Number, default: 0},
      royalty: {type: Number, default: 10}, // 10% royalty
      
      // Metadata
      artists: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      date: {type: String, default: new Date().toISOString()},
      modified: {type: String},
      published: {type: Boolean, default: false},
      
      // Generative art specific metadata
      generativeMetadata: {
        algorithmVersion: {type: String, default: '1.0'},
        framework: {type: String}, // e.g., 'p5.js', 'three.js', 'custom'
        libraries: {type: Array, default: []}, // e.g., ['p5.js', 'tone.js']
        renderingEngine: {type: String}, // e.g., 'canvas', 'webgl', 'svg'
        
        // Technical details
        resolution: {type: String, default: '1920x1080'},
        fileFormat: {type: String, default: 'png'},
        fileSize: {type: Number}, // in bytes
        
        // Artistic process
        creationTime: {type: Number}, // in milliseconds
        renderingTime: {type: Number}, // in milliseconds
        
        // Reproducibility
        deterministic: {type: Boolean, default: true},
        randomnessSource: {type: String, default: 'Math.random'},
      },
      
      // Display and interaction
      display: {type: Boolean, default: true},
      interactive: {type: Boolean, default: false},
      interactiveElements: {type: Array, default: []}, // e.g., ['mouse', 'touch', 'keyboard']
      
      // Social and engagement
      likes: {type: Number, default: 0},
      views: {type: Number, default: 0},
      favorites: {type: Number, default: 0},
      
      // Curation
      reviewed: {type: Boolean, default: false},
      curated: {type: Boolean, default: false},
      
      // Provenance and authenticity
      ipfsHash: {type: String},
      arweaveTx: {type: String},
      signature: {type: String},
      
      // Versioning
      version: {type: String, default: '1.0.0'},
      changelog: {type: Array, default: []},
      
      // Access control
      whitelist: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Whitelist',
        },
      ],
      
      // Categories and traits
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
      
      // Status and lifecycle
      status: {type: String, enum: ['draft', 'rendering', 'completed', 'published', 'archived'], default: 'draft'},
      
      // Performance metrics
      renderCount: {type: Number, default: 0},
      errorCount: {type: Number, default: 0},
      lastRendered: {type: String},
      
      // Integration with other systems
      integration: {
        ordinals: {type: Boolean, default: false},
        ordinalInscriptionId: {type: String},
        ordinalSat: {type: String},
        
        ethereum: {type: Boolean, default: false},
        ethereumContract: {type: String},
        
        tezos: {type: Boolean, default: false},
        tezosContract: {type: String},
        
        solana: {type: Boolean, default: false},
        solanaMint: {type: String},
      }
    }).pre('save', function (next) {
      if (!this.slug && this.name) {
        this.slug = this.name.toLowerCase().replace(/ /g, "-");
      }
      next();
    });

module.exports = GenerativeSerie;