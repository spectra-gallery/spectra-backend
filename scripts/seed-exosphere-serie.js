/**
 * Seed Script: Exosphere Generative Art Series
 *
 * Creates a database entry for the Exosphere generative audio-visual artwork
 * Located at: /sketchbook/generative-systems/exosys-origin/exosphere.html
 *
 * Usage: node scripts/seed-exosphere-serie.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spectra-gallery';

// Color palettes from exosphere.html
const exospherePalettes = [
  ["#40f2d0", "#999DFF", "#FF9751", "#545479", "#8EB49B", "#2F4858"],
  ["#082880", "#FD765D", "#FFB753", "#00BABB", "#5E5A8B", "#B02F37"],
  ["#7462f9", "#B5A6DC", "#68BAA6", "#EE1E2F", "#00098D", "#E0EEF0"],
  ["#f4b53f", "#2F4858", "#FFEDCB", "#4B8178", "#4E2D21", "#C1554E"],
  ["#1D1B33", "#2F4858", "#FFEDCB", "#4B8178", "#7197A8", "#362E37"]
];

// GenerativeSerie Schema (inline for seed script)
const GenerativeSerieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String },
  subtitle: { type: String },
  description: { type: String, required: true },
  image: { type: String, required: true },
  type: { type: String, default: 'generative' },
  algorithm: { type: String, required: true },
  parameters: { type: Object, default: {} },
  seed: { type: String, default: '' },
  palette: { type: Array, default: [] },
  sketchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sketch' },
  sketchSize: { type: Number, default: 1000 },
  captureDelay: { type: Number, default: 5000 },
  cssSelector: { type: String, default: 'body' },
  backgroundColor: { type: String, default: '#F2F0EC' },
  style: { type: String, default: 'abstract' },
  complexity: { type: Number, min: 1, max: 10, default: 5 },
  iterations: { type: Number, default: 100 },
  audioBased: { type: Boolean, default: false },
  audioAlgorithm: { type: String },
  audioParameters: { type: Object, default: {} },
  chain: { type: mongoose.Schema.Types.ObjectId, ref: 'Chain' },
  onChain: { type: Boolean, default: false },
  contractAddress: { type: String },
  tokenStandard: { type: String, enum: ['ERC721', 'ERC1155', 'BTC-Ordinals'] },
  totalSupply: { type: Number, default: 100 },
  supply: { type: Number, default: 0 },
  onSale: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  priceUSD: { type: Number, default: 0 },
  royalty: { type: Number, default: 10 },
  artists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  date: { type: String, default: new Date().toISOString() },
  modified: { type: String },
  published: { type: Boolean, default: false },
  generativeMetadata: {
    algorithmVersion: { type: String, default: '1.0' },
    framework: { type: String },
    libraries: { type: Array, default: [] },
    renderingEngine: { type: String },
    resolution: { type: String, default: '1920x1080' },
    fileFormat: { type: String, default: 'png' },
    fileSize: { type: Number },
    creationTime: { type: Number },
    renderingTime: { type: Number },
    deterministic: { type: Boolean, default: true },
    randomnessSource: { type: String, default: 'Math.random' }
  },
  display: { type: Boolean, default: true },
  interactive: { type: Boolean, default: false },
  interactiveElements: { type: Array, default: [] },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  reviewed: { type: Boolean, default: false },
  curated: { type: Boolean, default: false },
  ipfsHash: { type: String },
  arweaveTx: { type: String },
  signature: { type: String },
  version: { type: String, default: '1.0.0' },
  changelog: { type: Array, default: [] },
  whitelist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Whitelist' }],
  category: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  trait: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trait' }],
  status: { type: String, enum: ['draft', 'rendering', 'completed', 'published', 'archived'], default: 'draft' },
  renderCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  lastRendered: { type: String },
  integration: {
    ordinals: { type: Boolean, default: false },
    ordinalInscriptionId: { type: String },
    ordinalSat: { type: String },
    ethereum: { type: Boolean, default: false },
    ethereumContract: { type: String },
    tezos: { type: Boolean, default: false },
    tezosContract: { type: String },
    solana: { type: Boolean, default: false },
    solanaMint: { type: String }
  }
});

GenerativeSerieSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
  }
  next();
});

const GenerativeSerie = mongoose.model('GenerativeSerie', GenerativeSerieSchema);

// Exosphere Generative Serie Data
const exosphereData = {
  name: 'Exosphere: Diffusion Networks',
  subtitle: 'Audio-Visual Generative System',
  description: `Exosphere is an audio-visual generative art system that explores the relationship between sound synthesis and visual network dynamics. The piece creates organic, self-organizing network structures that evolve through growth, mitosis, and merging operations, while simultaneously generating procedural music based on algorithmic chord progressions.

The visual system simulates differential growth patterns where nodes and paths interact through attraction, repulsion, and clustering behaviors. Networks undergo constant transformation through growth, shrinkage, exchange, and mitosis events, creating emergent visual complexity.

The audio component uses FM synthesis to generate ambient soundscapes that respond to the visual network state. Multiple synthesizers (drone, stab, lead, pad) create layered textures following procedurally generated chord progressions in various musical keys and modes.

Features:
- Real-time procedural network visualization
- FM synthesis audio generation
- 35+ curated color palettes
- Interactive mouse-based parameter modulation
- Dynamic chord progression generation
- Self-organizing emergent patterns`,

  image: '/storage/generative/exosphere-preview.png',
  algorithm: 'differential-growth-network',

  parameters: {
    networks: 5,
    pathsPerNetwork: 18,
    nodesPerPath: { min: 9, max: 12 },
    growthOccurrence: 0.001,
    sinkOccurrence: 0.001,
    exchangeOccurrence: 0.001,
    randomOccurrence: 0.0001,
    mitosisOccurrence: 0.001,
    mergeOccurrence: 0.00001,
    bpm: 60,
    chordProgressionLength: 4
  },

  seed: '',
  palette: exospherePalettes[0],
  style: 'organic',
  complexity: 8,
  iterations: -1, // Infinite/continuous

  audioBased: true,
  audioAlgorithm: 'FM-synthesis',
  audioParameters: {
    synthesizers: ['drone', 'stab', 'stab2', 'lead', 'pad'],
    fmOperators: 5,
    droneEnvelope: { attack: 1, decay: 0.3, sustain: 0.1, release: 0.01 },
    stabEnvelope: { attack: 0.0002, decay: 0.1, sustain: 0.001, release: 0.005 },
    leadEnvelope: { attack: 0.5, decay: 0.6, sustain: 0.01, release: 0.4 },
    padEnvelope: { attack: 0, decay: 0, sustain: 0.1, release: 0.3 },
    delayTimes: [0.75, 0.375, 0.1875],
    feedbackRange: [0.6, 0.7, 0.8],
    reverbWet: [0.3, 0.4, 0.5]
  },

  tokenStandard: 'BTC-Ordinals',
  totalSupply: 100,
  supply: 0,
  onSale: false,
  price: 0,
  royalty: 10,

  generativeMetadata: {
    algorithmVersion: '1.0.0',
    framework: 'vanilla-js',
    libraries: ['Web Audio API', 'Canvas 2D'],
    renderingEngine: 'canvas',
    resolution: 'adaptive',
    fileFormat: 'html',
    deterministic: false,
    randomnessSource: 'Math.random with seed derivation'
  },

  display: true,
  interactive: true,
  interactiveElements: ['mouse', 'touch', 'click'],

  status: 'completed',
  published: true,
  curated: true,
  reviewed: true,

  integration: {
    ordinals: true,
    ordinalInscriptionId: '',
    ethereum: true,
    ethereumContract: '',
    tezos: false,
    solana: false
  },

  version: '1.0.0',
  changelog: [
    {
      version: '1.0.0',
      date: new Date().toISOString(),
      changes: ['Initial release of Exosphere generative system']
    }
  ]
};

async function seedExosphere() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Check if already exists
    const existing = await GenerativeSerie.findOne({ slug: 'exosphere-diffusion-networks' });

    if (existing) {
      console.log('Exosphere serie already exists. Updating...');
      await GenerativeSerie.updateOne(
        { slug: 'exosphere-diffusion-networks' },
        { $set: { ...exosphereData, modified: new Date().toISOString() } }
      );
      console.log('Updated existing Exosphere serie');
    } else {
      console.log('Creating new Exosphere serie...');
      const serie = new GenerativeSerie(exosphereData);
      await serie.save();
      console.log('Created Exosphere serie with ID:', serie._id);
    }

    console.log('Seed completed successfully!');

    // Verify the entry
    const result = await GenerativeSerie.findOne({ slug: 'exosphere-diffusion-networks' });
    console.log('\nVerification:');
    console.log('Name:', result.name);
    console.log('Slug:', result.slug);
    console.log('Algorithm:', result.algorithm);
    console.log('Audio Based:', result.audioBased);
    console.log('Status:', result.status);
    console.log('Published:', result.published);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seed
seedExosphere();
