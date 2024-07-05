const { address } = require('bitcoinjs-lib');
const { application } = require('express');
const mongoose = require('mongoose');

const User = mongoose.model(
    'User',
    new mongoose.Schema({
      username: String,
      slug: String,
      address: String,
      nonce: { type: Number, default: Math.floor(Math.random() * 1000000) },
      email: String,
      password: String,
      imageUrl: String,
      bannerUrl: String,
      website: String,
      headline: String,
      bio: String,
      twitter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Twitter',
      },
      instagram: String,
      discord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discord',
      },
      chains: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Chain',
        },
      ],
      mediums: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Medium',
        },
      ],
      sketches: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Sketch',
        },
      ],
      channelId: String,
      emailToken: String,
      volume: {type: Number, default: 0},
      whitelisted: {type: Boolean, default: false},
      creator: {type: Boolean, default: false},
      verified: {type: Boolean, default: false},
      applied: {type: Boolean, default: false},
      date: {type: String, default: new Date().toISOString()},
      lastLogin: {type: String, default: new Date().toISOString()},
      role: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
      ],
      like: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      likes: {type: Number, default: 0},


    }),
);

module.exports = User;
