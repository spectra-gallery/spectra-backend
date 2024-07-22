const db = require('../models');
const mail = require('../middlewares/mail');
const { address } = require('bitcoinjs-lib');

require('dotenv').config();
const Serie = db.serie;
const Element = db.element;
const User = db.user;

exports.createElement = async (req, res) => {

    const serie = await Serie.findOne({ _id: req.body.serieId });

    const userId = req.userId;

    if (!serie) {
        return res.status(404).send({ message: 'Serie not found' });
    }

    const user = await User.findOne({ _id: userId });


    const slug = req.body.name.toLowerCase().replace(/ /g, '-');
    const iteration = serie.supply + 1;

    try {
        const element = new Element({
        name: serie.name,
        slug: slug,
        iteration: iteration,
        subtitle: serie.subtitle,
        description: serie.description,
        address: user.address,
        artists: serie.artists,
        owner: user._id,
        serieRef: serie._id,
        chain: serie.chain
        });
    
       
    } catch (err) {
       
    }
    }
