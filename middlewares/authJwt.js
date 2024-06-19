const jwt = require('jsonwebtoken');
const config = require('../config/auth.config.js');
const sessionConfig = require('../config/session.config');
const db = require('../models');
const User = db.user;
const Role = db.role;

const bcrypt = require('bcryptjs');

const {TokenExpiredError} = jwt;

catchError = (err, res) => {
  if (err instanceof TokenExpiredError) {
    return res.status(401).send(
        {message: 'Unauthorized! Access Token was expired!'});
  }

  return res.sendStatus(401).send({message: 'Unauthorized!'});
};

verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];

  if (!token) {
    return res.status(403).send({message: 'No access token provided!'});
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'Unauthorized access token!'});
    }
    req.userId = decoded.id;
    next();
  });
};

verifySession = process.env.NODE_ENV == 'development' ?
(req, res, next) => {
  next();
} :
(req, res, next) => {
  const token = req.headers['session-token'];

  if (!token) {
    return res.status(403).send({message: 'No session token provided!'});
  }

  jwt.verify(token, sessionConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'unauthorized session token!'});
    }
    req.sessionId = decoded.id;

    next();
  });
};

getUsername = (req, res, next) => {
  User.findOne({_id: req.userId}).exec((err, user) => {
    if (err) {
      return res.status(401).send({message: err});
    }
    req.username = user.username;
    next();
  });
};

isAdmin = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    Role.find(
        {
          _id: {$in: user.role},
        },
        (err, role) => {
          if (err) {
            res.status(500).send({message: err});
            return;
          }

          for (let i = 0; i < role.length; i++) {
            if (role[i].name === 'admin') {
              next();
              return;
            }
          }

          res.status(403).send({message: 'Require Admin Role!'});
          return;
        },
    );
  });
};

isCreator = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    Role.find(
        {
          _id: {$in: user.role},
        },
        (err, role) => {
          if (err) {
            res.status(500).send({message: err});
            return;
          }

          for (let i = 0; i < role.length; i++) {
            if (role[i].name === 'creator') {
              next();
              return;
            }
          }

          res.status(403).send({message: 'Require Creator Role!'});
          return;
        },
    );
  });
};

const authJwt = {
  verifyToken,
  verifySession,
  catchError,
  getUsername,
  isAdmin,
  isCreator,
};
module.exports = authJwt;
