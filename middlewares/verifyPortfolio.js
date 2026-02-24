const db = require("../models");
const Portfolio = db.portfolio;

checkDuplicateName = (req, res, next) => {
  Portfolio.findOne({
    name: req.body.name,
  }).exec((err, post) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (post) {
      res.status(400).send({ message: "Post name is already in use!" });
      return;
    }
    next();
  });
};

checkDuplicateNameEdit = (req, res, next) => {
  Portfolio.findOne({
    name: req.body.name,
    _id: { $ne: req.params.id },
  }).exec((err, post) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (post) {
      res.status(400).send({ message: "Post name is already in use!" });
      return;
    }
    next();
  });
};

const verifyPortfolio = {
  checkDuplicateName,
  checkDuplicateNameEdit,
};

module.exports = verifyPortfolio;
