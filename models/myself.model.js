const mongoose = require('mongoose');

const Myself = mongoose.model(
    'Myself',
    new mongoose.Schema({
        // evaluate the atypique archetype, 
        // critical thinking, 
        // subersive thinking, 
        // abstract thinking, 
        // creative thinking, 
        // neurodivergent mind, 
        // anarchist predisposition,
        // humility and self-awareness

    }),
);

module.exports = Myself;
