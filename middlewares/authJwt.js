const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const sessionConfig = require("../config/session.config");
const db = require("../models");

const User = db.user;
const Role = db.role;
const RefreshToken = db.refreshToken;
const SessionRefreshToken = db.sessionRefreshToken;

const bcrypt = require("bcryptjs");

const { TokenExpiredError } = jwt;

const BASE_URL = process.env.BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;

catchError = (err, res) => {
  if (err instanceof TokenExpiredError) {
    return res
      .status(401)
      .send({ message: "Unauthorized! Access Token was expired!" });
  }

  return res.sendStatus(401).send({ message: "Unauthorized!" });
};

verifyRole = (req, res, next) => {
  const role = req.role;

  roleToId(role)
    .then((roleId) => {
      req.roleId = roleId;
      next();
    })
    .catch((err) => catchError(err, res));
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

const checkRefreshToken = async (req, res, next) => {
  const requestToken = req.refreshToken;

  try {
    const refreshToken = await RefreshToken.findOne({ token: requestToken });

    if (!refreshToken) {
      return res.status(403).send({ message: "Refresh token not found!" });
    }

    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.findByIdAndRemove(refreshToken._id, {
        useFindAndModify: false,
      }).exec();

      res.status(403).json({
        message: "Refresh token was expired. Please make a new signin request",
      });
      return;
    }

    const newAccessToken = jwt.sign(
      { id: refreshToken.user },
      config.secret,
      {
        expiresIn: config.jwtExpiration,
      }
    );
    // set header in the response to refresh token
    res.setHeader("refresh-token", "true");
    return res // status token expired but refresh token is valid error code to trigger refresh token
      .status(401)
      .send({ accessToken: newAccessToken, refreshToken: refreshToken.token });
  } catch (err) {
    return res.status(500).send({ message: err });
  }

};

verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];
  
  if (!token) {
    return res.status(403).send({ message: "No access token provided!" });
  }
  

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      if (err instanceof TokenExpiredError) {
        const refreshToken = req.headers["x-refresh-token"];

        if (!refreshToken) {
          return res.status(403).send({ message: "No refresh token provided!" });
        }

        req.refreshToken = refreshToken; 

        checkRefreshToken(req, res, next);
        return;
      }
      // set header in the response to unauthorized refresh token
      res.setHeader("refresh-token", "false");
      return res.status(401).send({
        message: "Unauthorized access token!" 
      });
    }
    req.token = token;
    req.userId = decoded.id;
    next();
  });
};

const checkSessionRefreshToken = async (req, res, next) => {
  const requestToken = req.sessionRefreshToken;

  try {
    const refreshToken = await SessionRefreshToken.findOne({ token: requestToken });

    if (!refreshToken) {
      return res.status(403).send({ message: "Refresh session token not found!" });
    }

    if (SessionRefreshToken.verifyExpiration(refreshToken)) {
      SessionRefreshToken.findByIdAndRemove(refreshToken._id, {
        useFindAndModify: false,
      }).exec();

      res.status(403).json({
        message: "Refresh session token was expired.",
      });
      return;
    }

    const newAccessToken = jwt.sign(
      { id: refreshToken.sessionId },
      config.secret,
      {
        expiresIn: config.jwtExpiration,
      }
    );
    // set header in the response to refresh token
    res.setHeader("refresh-session-token", "true");
    console.log("Unauthorized access token, but refreshed!");
    return res // status token expired but refresh token is valid error code to trigger refresh token
      .status(401)
      .send({ sessionToken: newAccessToken, sessionRefresh: refreshToken.token });
  } catch (err) {
    return res.status(500).send({ message: err });
  }

};

verifySession =
  process.env.NODE_ENV == "development"
    ? (req, res, next) => {
        next();
      }
    : (req, res, next) => {
        const token = req.headers["session-token"];

        if (!token) {
          // set header in the response to unauthorized session token
          res.setHeader("refresh-session-token", "false");
          return res
            .status(403)
            .send({ message: "No session token provided!" });
        }

        jwt.verify(token, sessionConfig.secret, (err, decoded) => {
          if (err) {
            if (err instanceof TokenExpiredError) {
              const refreshToken = req.headers["session-refresh"];
      
              if (!refreshToken) {
                return res.status(403).send({ message: "No refresh session token provided!" });
              }
      
              req.sessionRefreshToken = refreshToken; 
      
              checkSessionRefreshToken(req, res, next);
              return;
            }
            // set header in the response to unauthorized session token
            res.setHeader("refresh-session-token", "false");
            console.log("Unauthorized access token! not refreshed");
            return res
              .status(401)
              .send({ 
                message: "unauthorized session token!" 
              });
          }
          req.sessionId = decoded.id;

          next();
        });
      };

getUsername = (req, res, next) => {
  User.findOne({ _id: req.userId }).exec((err, user) => {
    if (err) {
      return res.status(401).send({ message: err });
    }
    req.username = user.username;
    next();
  });
};

const isAdmin = (req, res, next) => {
  admin(req.userId)
    .then((isAdmin) => {
      if (!isAdmin) {
        res.status(403).send({ message: "Require Admin Role!" });
        return;
      }
      next();
    })
    .catch((err) => catchError(err, res)); // handle errors with catchError
};

const admin = (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId).exec((err, user) => {
      if (err) {
        return reject(err); // reject on any error with user retrieval
      }

      Role.find({ _id: { $in: user.role } }, (err, roles) => {
        if (err) {
          return reject(err); // reject if role lookup fails
        }

        const isAdmin = roles.some((role) => role.name === "admin");
        if (isAdmin) {
          resolve(true); // resolve with true if the user is an admin
        } else {
          resolve(false); // resolve with false otherwise
        }
      });
    });
  });
};

// is author of a defined objeect
isAuthor = async (req, res, next) => {
  const userId = req.userId;
  const target = req.target;

  const model = db[target];

  // check if user is author of the object
  model.findOne({ _id: req.params.id }).exec((err, object) => {
    if (err) {
      return res.status(500).send({ message: err });
    }

    if (object.author.includes(userId) || object.artist.includes(userId)) {
      next();
      return true;
    }

    return false;
  });
};

const reviewer = (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId).exec((err, user) => {
      if (err) {
        return reject(err); // reject on any error with user retrieval
      }

      Role.find({ _id: { $in: user.role } }, (err, roles) => {
        if (err) {
          return reject(err); // reject if role lookup fails
        }

        const isReviewer = roles.some((role) => role.name === "reviewer");
        if (isReviewer) {
          resolve(true); // resolve with true if the user is an admin
        } else {
          resolve(false); // resolve with false otherwise
        }
      });
    });
  });
};

isReviewer = (req, res, next) => {
  reviewer(req.userId)
    .then((isReviewer) => {
      if (!isReviewer) {
        res.status(403).send({ message: "Require Reviewer Role!" });
        return;
      }
      next();
    })
    .catch((err) => catchError(err, res)); // handle errors with catchError
};

isAuthorOrAllowed = async (req, res, next) => {
  const userId = req.userId;
  const target = req.target;

  const model = db[target];

  const isAdmin = await admin(userId);
  const isReviewer = await reviewer(userId);

  // check if user is author of the object
  model.findOne({ _id: req.params.id }).exec((err, object) => {
    if (err) {
      return res.status(500).send({ message: err });
    }

    if (
      object.author.includes(userId) ||
      object.artist.includes(userId) ||
      (object.allowed.includes(userId) && isReviewer) ||
      isAdmin
    ) {
      next();
      return true;
    }

    return false;
  });
};

isAllowedReviewer = async (req, res, next) => {
  const userId = req.userId;
  let target = req.target;

  if (target === "blog") {
    target = "post";
  }

  const model = db[target];

  const isAdmin = await admin(userId);
  const isReviewer = await reviewer(userId);

  // check if user is author of the object
  model.findOne({ _id: req.params.id }).exec((err, object) => {
    if (err) {
      return res.status(500).send({ message: err });
    }

    if ((object.allowed.includes(userId) && isReviewer) || isAdmin) {
      next();
      return true;
    }
    res.status(403).send({ message: "Require Reviewer Role!" });
    return false;
  });
};

isThinker = (req, res, next) => {
  thinker(req.userId)
    .then((isThinker) => {
      if (!isThinker) {
        res.status(403).send({ message: "Require Thinker Role!" });
        return;
      }
      next();
    })
    .catch((err) => catchError(err, res)); // handle errors with catchError
};

const thinker = (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId).exec((err, user) => {
      if (err) {
        return reject(err); // reject on any error with user retrieval
      }

      Role.find({ _id: { $in: user.role } }, (err, roles) => {
        if (err) {
          return reject(err); // reject if role lookup fails
        }

        const isThinker = roles.some((role) => role.name === "thinker");
        if (isThinker) {
          resolve(true); // resolve with true if the user is an admin
        } else {
          resolve(false); // resolve with false otherwise
        }
      });
    });
  });
};

isCreator = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    Role.find(
      {
        _id: { $in: user.role },
      },
      (err, role) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        for (let i = 0; i < role.length; i++) {
          if (role[i].name === "creator") {
            next();
            return;
          }
        }

        res.status(403).send({ message: "Require Creator Role!" });
        return;
      }
    );
  });
};

imMySelf = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    Role.find(
      {
        _id: { $in: user.role },
      },
      (err, role) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        for (let i = 0; i < role.length; i++) {
          if (role[i].name === "myself") {
            next();
            return;
          }
        }

        res.status(403).send({ message: "Require To be Yourself!" });
        return;
      }
    );
  });
};

confirmImMySelf = (req, res, next) => {
  const status = req.body.status;

  if (status) {
    next();
    return;
  } else {
    res.redirect(`${CLIENT_URL}user/myself/confirm`);
    return;
  }
};

const authJwt = {
  verifyToken,
  verifySession,
  catchError,
  verifyRole,
  getUsername,
  isAdmin,
  isAuthor,
  isCreator,
  isThinker,
  isReviewer,
  imMySelf,
  confirmImMySelf,
  isAuthorOrAllowed,
  isAllowedReviewer,
};
module.exports = authJwt;
