const mongoose = require("mongoose");

const Overview = mongoose.model(
  "Overview",
  new mongoose.Schema({
  
    overviewed: { type: Boolean, default: false },
    require_human: { type: Boolean, default: false },
    require_tribe: { type: Boolean, default: false },
    overviewed_by_human: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () {
          return this.require_human;
        },
    },
    overviewed_by_tribe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tribe",
        required: function () {
          return this.require_tribe;
        },
    },
    require_role: [
        { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
        },
    ],
    overviewDate: { type: Date, default: new Date().toISOString() },
    label: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    sign_data: { type: String },

  }).pre('save', function (next) {
    
    
    next();
  })
);


  

module.exports = Overview;
