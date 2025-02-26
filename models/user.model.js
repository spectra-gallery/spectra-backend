const mongoose = require("mongoose");
const db = require("../models");
const Role = db.role;

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    slug: String,
    address: String,
    bitcoin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bitcoin",
    },
    nonce: { type: Number, default: Math.floor(Math.random() * 1000000) },
    email: String,
    password: {
      type: String,
      required: true,
      select: false
    },
    imageUrl: String,
    bannerUrl: String,
    website: String,
    headline: String,
    bio: String,
    twitter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Twitter",
    },
    instagram: String,
    bluesky: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bluesky",
    },
    discord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discord",
    },
    chains: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chain",
      },
    ],
    mediums: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medium",
      },
    ],
    sketches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sketch",
      },
    ],
    channelId: String,
    emailToken: String,
    volume: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    whitelisted: { type: Boolean, default: false },
    creator: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    applied: { type: Boolean, default: false },
    customer: { type: Boolean, default: false },
    date: { type: String, default: new Date().toISOString() },
    lastModified: { type: String },
    lastLogin: { type: String, default: new Date().toISOString() },
    age: { type: Number, min: 5},
    role: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    credentials: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Credential",
      },
    ],
    challenges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Challenge",
      },
    ],
    _2FA_enabled: { type: Boolean, default: false },
    _2FA_registered: { type: Boolean, default: false },
    _2FA_secret: { type: String, select: false },
    cypher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cypher",
      select: false
    },
    like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likes: { type: Number, default: 0 },
    trait: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trait",
    },
    myself: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Myself",
    },
    nuance: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Nuance",
      },
    ],
    theme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
    },

    frequentWords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Word",
      },
    ],

    
  }).pre('save', function (next) {
    if (!this.slug && this.name) {
      this.slug = this.name.toLowerCase().replace(/ /g, "-");
    }
  
    this.lastModified = new Date().toISOString();
  
    // has to have an email to be verified
    if (this.verified && !this.email) {
      next(new Error("No email"));
    }
    // if neither password is set or email is set or address is set or bitcoin is set
  
    // cannot be myself 
  
    // canot be whitelisted if no address or no bitcoin
    if (this.whitelisted && (!this.address && !this.bitcoin)) {
      next(new Error("No address ETH or bitcoin"));
    }
  
    // the name cannot be too long
    if (this.name && this.name.length > 20) {
      next(new Error("Name too long"));
    }
    if (this.headline && this.headline.length > 60) {
      next(new Error("Headline too long"));
    }
    
    // _2fa cannot be enabled if not registered
    if (this._2FA_enabled && !this._2FA_registered) {
      next(new Error("2FA not registered"));
    }

    // if 2fa is enabled it has to have a secret
    if (this._2FA_enabled && !this._2FA_secret) {
      next(new Error("No 2FA secret"));
    }



    next();
  })
);



module.exports = User;
