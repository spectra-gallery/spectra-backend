const db = require("../models");
const ROLES = db.ROLES;
const User = db.user;

require("dotenv").config();

const PROPERTY_TRY_LIMIT = process.env.PROPERTY_TRY_LIMIT;

// check if a user has the medium object
checkPropertyRef = (req, res, next) => {
  if (req.params.id) {
    const target = req.target;
    const Model = db[target];

    const property = req.property;
    const Prop = db[property];
    Model.find({
      mediums: req.params.id,
    }).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (user && user.length > 0) {
        // check how many users have the medium
        const count = user.length;
        res.status(400).send({
          id: req.params.id,
          message: `${Prop} is in use across ${count} ${property}`,
          count: count,
          requestConfirm: true,
          validation: "Confirm delete medium and remove from users?",
          confirmed: false,
          dbCollection: "user",
          targetField: "mediums",
          tryLimit: PROPERTY_TRY_LIMIT,
        });
        return;
      }

      next();
    });
  } else {
    return res.status(400).send({ message: "No medium id provided!" });
  }
};

propertyExists = async (req, res, next) => {
  const promise = new Promise((resolve, reject) => {
    if (req.body.name) {
      const property = req.property;
      const Model = db[property];

      Model.find({
        name: req.body.name,
      }).exec((err, medium) => {
        if (err) {
          // res.status(500).send({ message: err });
          // return promise
          return reject(err);
        }

        if (medium) {
          const message = "Medium name is already in use!";
          // res.status(400).send({ message: "Medium name is already in use!" });
          // return promise
          return reject(message);
        }

        // return promise
        return resolve(next());
      });
    } else {
      const message = "Medium name is required!";
      //res.status(400).send({ message: "Medium name is required!" });
      return reject(message);
    }

    return resolve(next());
  });

  try {
    const result = await promise;
    return result;
  } catch (err) {
    res.status(500).send({ message: err });
  }
};

const verifyProperty = {
  checkPropertyRef,
  propertyExists,
};

module.exports = verifyProperty;
