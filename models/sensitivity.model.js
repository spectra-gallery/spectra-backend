const mongoose = require('mongoose');

const Sensitivity = mongoose.model(
    'Sensitivity',
    new mongoose.Schema({
        name: { type: String, enum: ["all public", "9 y/o +", "12 y/o +", "16 y/o +", "18 y/o +", "21 y/o +"] },
        description: { type: String, default: ''},
        recommended_age: { type: Number, default: 0, min: 0 },
        require_age_verfied: { type: Boolean, default: false },
        require_auth: { type: Boolean, default: false },
        require_role: { type: Boolean, default: false },
        require_tribe: { type: Boolean, default: false },
        require_roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            }
        ],
        require_tribe: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tribe'
            }
        ],
        require_confirmation: { type: Boolean, default: false },
        confirmation_message: { type: String, default: ''},
        require_2fa: { type: Boolean, default: false },
        require_review: { type: Boolean, default: false },
        nb_required_reviews: { type: Number, default: 0, min: 0 }
    }).pre('save', function (next) {
       // address validation
  
        if (this.recommended_age < 9) {
            this.name = "all public |" + this.name;
        } else if (this.recommended_age < 12) {
            this.name = "9 y/o + |" + this.name;
        } else if (this.recommended_age < 16) {
            this.name = "12 y/o + |" + this.name;
            this.require_age_verfied = true;
        } else if (this.recommended_age < 18) {
            this.name = "16 y/o + |" + this.name;
            this.require_age_verfied = true;
        } else if (this.recommended_age < 21) {
            this.require_age_verfied = true;
            this.name = "18 y/o + |" + this.name;
        } else {
            this.require_age_verfied = true;
            this.name = "21 y/o + |" + this.name;
        }

        // if role required then require auth
        if (this.require_role || this.require_2fa || this.require_age_verfied) {
            this.require_auth = true;
        }

        // 
      
        next();
      })
);

module.exports = Sensitivity;
