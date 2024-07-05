const db = require('../models');
const ROLES = db.ROLES;
const User = db.user;

checkDuplicateUsername = (req, res, next) => {
  // check username and id !== id
  User.findOne({
    username: req.body.username,
    _id: {$ne: req.userId},
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    if (user) {
      res.status(400).send({message: 'Username is already in use!'});
      return;
    }
    next();
  });
};

checkDuplicateEmail = (req, res, next) => {
  if (req.body.email) {
    User.findOne({
      email: req.body.email,
      _id: {$ne: req.userId},
    }).exec((err, user) => {
      if (err) {
        res.status(500).send({message: err});
        return;
      }

      if (user) {
        res.status(400).send({message: 'Email is already in use!'});
        return;
      }

      next();
    });
  } else {
    next();
  }
};

// check duplicate address
checkDuplicateAddress = (req, res, next) => {
  if (req.body.address) {
    User.findOne({
      address: req.body.address,
    }).exec((err, user) => {
      if (err) {
        res.status(500).send({message: err});
        return;
      }

      if (user) {
        res.status(400).send({message: 'Address is already in use!'});
        return;
      }

      next();
    });
  } else {
    next();
  }
};

checkRolesExisted = (req, res, next) => {
  if (req.body.role) {
    for (const role of req.body.role) {
      if (!ROLES.includes(role)) {
        res.status(400).send({
          message: `Role ${role} does not exist!`,
        });
        return;
      }
    }
  }

  next();
};

// checkPassword match
checkPassword = (req, res, next) => {
  if (req.body.password !== req.body.confirmPassword) {
    res.status(400).send({
      message: `Password does not match!`,
    });
    return;
  }
  next();
};

const verifySignUp = {
  checkDuplicateUsername,
  checkDuplicateEmail,
  checkDuplicateAddress,
  checkRolesExisted,
  checkPassword,
};

module.exports = verifySignUp;
