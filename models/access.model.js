const mongoose = require('mongoose');

const Access = mongoose.model(
    'Access',
    new mongoose.Schema({
        passcode: {type: String, select: false},
        token: {type: String, select: false},
        time_limited: {type: Boolean, default: false},
        date_expiration: {type: Date, required: function() { return this.time_limited; }},
        select_user: {type: Boolean, default: false},
        select_role: {type: Boolean, default: false},
        select_tribe: {type: Boolean, default: false},
        select_age: {type: Boolean, default: false},
        select_origin: {type: Boolean, default: false},
        authorized_user: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: function() { return this.select_user; }
            },
        ],
        authorized_role: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role',
                required: function() { return this.select_role; }
            },
        ],
        authorized_tribe: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tribe',
                required: function() { return this.select_tribe; }
            },
        ],
        authorized_age: {type: Number, min: 5, required: function() { return this.select_age; }},
        authorized_origin: {type: String, required: function() { return this.select_origin; }},
    }).pre('save', function (next) {
       // address validation
  
        if (this.time_limited && !this.date_expiration) {
            this.date_expiration = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
        }

        // generate token and access link
        if (!this.token) {
            this.token = require('crypto').randomBytes(64).toString('hex');
        }
      
        next();
      })
);

module.exports = Access;
