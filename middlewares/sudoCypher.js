const config = require("../config/auth.config.js");
const sessionConfig = require("../config/session.config");
const db = require("../models");

const User = db.user;
const Role = db.role;

const BASE_URL = process.env.BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;

requireSudo = (req, res, next) => {
  const sudo = req.session.sudo;

  if (!sudo || sudo.expires < Date.now()) {
    return res.status(403).send("Sudo privileges required (FIDO2 re-auth).");
  }
  next();
};

isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res
      .status(401)
      .send("Not authenticated. Please /login or /register.");
  }
  next();
};

requireRole = (role) => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).send("Not authenticated");
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    if (!user.role.includes(role)) {
      return res.status(403).send("Forbidden: insufficient role");
    }
    next();
  };
};

// verify role dynamically
/*
verifyDynamicRole = (req, res, next) => {
  const role = req.role;

  roleToId(encyptedRole)
    .then((roleId) => {
      req.roleId = roleId;
      next();
    })
    .catch((err) => {
        return res.status(401).send({ message: "Unauthorized access token!" });
    });
};

const roleToId = (role) => {
  
  return new Promise((resolve, reject) => {
    Role.findOne({ name: role }).exec((err, role) => {
      if (err) {
        return reject(err);
      }
      resolve(role._id);
    });
  });
};

verifyExpressSessionToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({ message: "No access token provided!" });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access token!" });
    }
    req.userId = decoded.id;
    next();
  });
};
*/

const sudoCypher = {
  requireSudo,
  isAuthenticated,
  requireRole,
};
module.exports = sudoCypher;
