const db = require('../models');
const Serie = db.serie;

checkDuplicateName = (req, res, next) => {
  Serie.findOne({
    name: req.body.name,
  }).exec((err, serie) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    if (serie) {
      res.status(400).send({message: 'Serie name is already in use!'});
      return;
    }
    next();
  });
};

checkDuplicateNameEdit = (req, res, next) => {
  Serie.findOne({
    name: req.body.name,
    _id: {$ne: req.params.id},
  }).exec((err, serie) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    if (serie) {
      res.status(400).send({message: 'Serie name is already in use!'});
      return;
    }
    next();
  });
};

const verifySerie = {
  checkDuplicateName,
  checkDuplicateNameEdit,
};

module.exports = verifySerie;
