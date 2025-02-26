const mongoose = require('mongoose');

const Textmonitor = mongoose.model(
    'Textmonitor',
    new mongoose.Schema({
        flag: {type: Boolean},
        identity_attack: {type: Boolean},
        insult: {type: Boolean},
        obscene: {type: Boolean},
        severe_toxicity: {type: Boolean},
        sexual_explicit: {type: Boolean},
        threat: {type: Boolean},
        toxicity: {type: Boolean}
    }).pre('save', function (next) {
        if (this.identity_attack || this.insult || this.obscene || this.severe_toxicity || this.sexual_explicit || this.threat || this.toxicity) {
            this.flag = true;
        }
        next();
      })
);


  

module.exports = Textmonitor;
