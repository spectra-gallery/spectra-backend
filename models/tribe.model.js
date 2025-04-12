const mongoose = require("mongoose");


const Tribe = mongoose.model(
  "Tribe",
  new mongoose.Schema({
    // define a model and structure to define tribe between human and ai agent, language model
    tribe_name: { type: String },
    unity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unity",
      select: false
    },
    unity_number: { type: Number, default: 1 },
    tribe_headline: { type: String },
    tribe_bio: { type: String },
    tribe_image: { type: String },
    tribe_slug: { type: String },
    tribe_date: { type: String, default: new Date().toISOString() },
    tribe_confidence: { type: Number, default: 0 },
    active: { type: Boolean, default: false },
    tribe_passcode: { type: String, select: false },
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
    genuine: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    _2FA_enabled: { type: Boolean, default: false },
    _2FA_registered: { type: Boolean, default: false },
    _2FA_secret: { type: String, select: false },
    cypher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cypher",
    },
    agency: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
        }
    ],
    overview: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Overview",
        },
    ],
    eth_address: { type: String },
    nonce: { type: Number, default: Math.floor(Math.random() * 1000000) },
    bitcoin_address: { type: String },
    smart_contract_address: { type: String },
    website: { type: String },
    email: { type: String },
    twitter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Twitter",
    },
    instagram: { type: String },
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
    user_like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    user_likes: { type: Number, default: 0 },
    tribe_like: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "tribe",
        },
    ],
    tribe_likes: { type: Number, default: 0 },
    channelId: { type: String },
    last_seen: { type: String, default: new Date().toISOString() },
    age_limit: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  }).pre("save", function (next) {
    next();
  })
);

module.exports = Tribe;
