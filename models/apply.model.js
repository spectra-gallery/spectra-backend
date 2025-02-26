const e = require('express');
const mongoose = require('mongoose');
const db = require('../models');
const User = db.user;

const Apply = mongoose.model(
    'Apply',
    new mongoose.Schema({
      type: {type: String, enum: ['admin', 'creator', 'thinker', 'reviewer', 'e-libre', 'myself'], required: true},
      about: {type: String, required: true},
      links: [String],
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      date: {type: String, default: new Date().toISOString()},
      granted: {type: Boolean, default: false},
      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'},
    }).pre('save', function (next) {
      // cannot grant an aplication to oneself
       if (this.user === this.grantedBy) {
          next(new Error('Cannot grant an application to oneself'));
       }
     
       // if applicatitio approved change the status
       if (this.granted) {
         this.status = 'approved';
       }
     
       // if application was created more than 30 days ago and not granted, reject it
       const date = new Date(this.date);
       const now = new Date();
       const diff = now - date;
       const days = diff / (1000 * 60 * 60 * 24);
       if (days > 30 && !this.granted) {
         this.status = 'rejected';
       }
       
       next();
     })
);


module.exports = Apply;
