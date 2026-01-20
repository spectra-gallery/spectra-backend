const mongoose = require('mongoose');

const Neuralmap = mongoose.model(
    'Neuralmap',
    new mongoose.Schema({
        name: {type: String, default: ''},
        slug: {type: String},
        authors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        nodes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Nodemap',
            },
        ],
        links: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Linkmap',
            },
        ],
        date: {type: String, default: new Date().toISOString()},
    }).pre('save', function (next) {
        if (!this.slug && this.name) {
          this.slug = this.name.toLowerCase().replace(/ /g, "-");
        }
        next();
      })
);



module.exports = Neuralmap;
