const config = require('../config/auth.config');
const sessionConfig = require('../config/session.config');
const db = require('../models');
const mail = require('../middlewares/mail');
// const discord = require('../middlewares/discord');
require('dotenv').config();
const User = db.user;
const Medium = db.medium;
const Comment = db.comment;
const Token = db.token;
const Role = db.role;
const Session = db.session;
const RefreshToken = db.refreshToken;
const Auth = db.auth;
const Chain = db.chain;

const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');

bitcoin.initEccLib(ecc);

var ethUtil = require('ethereumjs-util');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const crypto = require('crypto');

const { TezosToolkit } = require('@taquito/taquito');
const { verifySignature } = require('@taquito/utils');

const CLIENT_URL = process.env.CLIENT_URL;
// const BASE_URL = process.env.BASE_URL;

/* verify user credentials to access a protected route */
exports.validateToken = (req, res) => {
  // check if user with given id exists in db if doesn't exist return 401 false
  User.findById(req.userId)
    .populate('role', '-__v')
    .exec(async (err, user) => {
      if (!user) {
        return res.status(403).send(false);
      }
      // if user found return true
      res.status(200).send(true);
    });
};

/* populate user object on the front end using state managment */
// get User data from id
exports.getUserData = (req, res) => {
  User.findById(req.userId)
    .populate('role', '-__v')
    .populate('section', '-__v')
    .populate('twitter', '-__v')
    .populate('discord', '-__v')
    .populate('mediums', '-__v')
    .exec(async (err, user) => {
      if (!user) {
        return res.status(403).send(false);
      }

      const authorities = [];

      for (const role of user.role) {
        authorities.push({
          id: role._id,
          name: 'ROLE_' + role.name.toUpperCase(),
        });
      }

      // if user found return true
      res.status(200).send({
        id: user._id,
        username: user.username,
        slug: user.slug,
        email: user.email,
        address: user.address,
        role: authorities,
        imageUrl: user.imageUrl,
        website: user.website,
        headline: user.headline,
        bio: user.bio,
        mediums: user.mediums,
        twitter: user.twitter,
        instagram: user.instagram,
        discord: user.discord,
        whitelisted: user.whitelisted,
        verified: user.verified,
        applied: user.applied,
      });
    });
};

exports.generateStorageToken = (req, res) => {
  const slug = req.body.slug;

  const token = jwt.sign({ id: req.userId, slug }, config.secret, {
    expiresIn: config.jwtExpiration, // 24 hours
  });

  res.status(200).send({
    storageToken: token,
  });
};

// generate session token for client
exports.generateSessionToken = (req, res) => {
  const sessionId = crypto.randomBytes(16).toString('base64');

  const token = jwt.sign({ id: sessionId }, sessionConfig.secret, {
    expiresIn: sessionConfig.jwtExpiration, // 24 hours
  });


  // save session token in database
  const session = new Session({
    sessionId: sessionId,
    ip: req.ip,
  });

  session.save((err, session) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
  });

  res.status(200).send({
    sessionId: sessionId,
    sessionToken: token,
  });
};

// get last 10 sessions
exports.getSessions = (req, res) => {
  Session.find().sort({ date: -1 }).limit(10).exec((err, sessions) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    const _sessions = [];

    // add session to array only if session.sessionId and session.ip are defined
    for (const session of sessions) {
      if (session.sessionId && session.ip) {
        _sessions.push({
          sessionId: session.sessionId,
          ip: session.ip,
          date: session.date,
        });
      }
    }


    res.status(200).send({
      sessions: _sessions,
    });
  });
};



exports.isWeb3Registered = async (req, res) => {
  // check if user address is in database return true or false

  const user = await User.findOne({
    address: req.params.address
  })

  if (user) {
    res.status(200).send({
      registered: true
    });
  } else {
    res.status(200).send({
      registered: false
    });
  }
}

exports.registerWeb3 = async (req, res) => {

  // generate a random username
  const username = Math.random().toString(36).substring(7);

  const chain = new Chain({
    name: 'ethereum',
    address: req.body.address
  });

  await chain.save();

  const chainId = chain._id;

  // create new user with address

  const user = new User({
    address: req.body.address,
    username: username,
    email: "",
    password: "",
    imageUrl: "",
    chain: [chainId],
  });

  const role = await Role.findOne({ name: 'user' });
  user.role = [role._id];

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return res.status(200).send(false);
    }

    // return true if user is created
    res.status(200).send(true);
  });
}

exports.getNonce = async (req, res) => {
  // get nonce from user
  const user = await User.findOne({

    address: req.params.address
  })

  if (user) {
    res.status(200).send({
      nonce: user.nonce
    });
  } else {
    res.status(200).send(false);
  }
}

exports.web3Login = async (req, res) => {
  // get user from database
  const user = await User.findOne({
    address: req.body.address
  }).populate("role", "-__v")

  if (user) {
    const msg = user.nonce + user.address;
    // Convert msg to hex string
    const msgHex = ethUtil.bufferToHex(Buffer.from(msg));

    // Check if signature is valid
    const msgBuffer = ethUtil.toBuffer(msgHex);
    const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
    const signatureBuffer = ethUtil.toBuffer(req.body.signature);
    const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
    const publicKey = ethUtil.ecrecover(
      msgHash,
      signatureParams.v,
      signatureParams.r,
      signatureParams.s
    );
    const addresBuffer = ethUtil.publicToAddress(publicKey);
    const address = ethUtil.bufferToHex(addresBuffer);
    // Check if address matches
    if (address.toLowerCase() === req.body.address.toLowerCase()) {
      // Change user nonce
      user.nonce = Math.floor(Math.random() * 1000000);
      user.save((err) => {
        if (err) {
          res.send(err);
        }
      });

      var token = jwt.sign({
        id: user._id,
        address: user.address
      }, config.secret, {
        expiresIn: config.jwtExpiration, // 24 hours
      });

      let refreshToken = await RefreshToken.createToken(user);

      var authorities = [];

      for (let i = 0; i < user.role.length; i++) {
        authorities.push("ROLE_" + user.role[i].name.toUpperCase());
      }
    
      res.status(200).send({
        id: user._id,
        accessToken: token,
        refreshToken: refreshToken,
        role: authorities,
      });
    } else {
      // User is not authenticated
      res.status(401).send('Invalid credentials');
    }
  } else {
    res.send('User does not exist');
  }
}

exports.registerNewUser = async (req, res) => {
  // create new user with address

  const slug = req.body.username.toLowerCase().replace(/ /g, '-');
  const user = new User({
    cardinalAddress: req.body.cardinalAddress,
    ordinalAddress: req.body.ordinalAddress,
    username: req.body.username,
    slug: slug,
    email: '',
    password: '',
    imageUrl: req.body.imageUrl,
    bannerUrl: req.body.bannerUrl,
    website: req.body.website,
    bio: req.body.bio,
  });

  const sections = req.body.section;

  // add section to user
  if (sections.length > 0) {
    sections.forEach(async (section) => {
      await user.section.push(section);
    });
  }

  await user.save();


  const role = await Role.findOne({ name: 'user' });
  user.role = [role._id];

  user.save((err, user) => {
    if (err) {
      return res.status(200).send({
        registered: false,
      });
    }

    // return true if user is created
    res.status(200).send({
      registered: true,
    });
  });
};

exports.signup = (req, res) => {
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    isVerified: false,
    password: bcrypt.hashSync(req.body.password, 8)
  });
  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (req.body.role) {
      Role.find(
        {
          name: { $in: req.body.role }
        },
        (err, role) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

          user.role = role.map(role => role._id);
          user.save(err => {
            if (err) {
              res.status(500).send({ message: err });
              return;
            }

            res.send({ message: "User was registered successfully!" });
          });
        }
      );
    } else {
      Role.findOne({ name: "user" }, (err, role) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        user.role = [role._id];
        user.save(err => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

          res.send({ message: "User was registered successfully!" });
        });
      });
    }

    // mail.sendVerificationEmail(user, req, res);
  });
};
/*
exports.getLoggedInUserObject = async (req, res, next) => {
    
    await User.findOne({ _id: req.userId }, (err, user) => {
      if (err) {
        return res.status(401).send({ message: err });
      }
      next();
      return user.username;
    });
    
};
*/
exports.signin = (req, res) => {
  User.findOne({
    email: req.body.email
  })
    .populate("role", "-__v")
    .exec(async (err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: config.jwtExpiration, // 24 hours
      });

      let refreshToken = await RefreshToken.createToken(user);

      var authorities = [];

      for (let i = 0; i < user.role.length; i++) {
        authorities.push(user.role[i].name);
      }
      /*
      res.status(200).send({
        id: user._id,
        username: user.username,
        email: user.email,
        imageUrl: user.imageUrl,
        isVerified: user.isVerified,
        role: authorities,
        accessToken: token,
        refreshToken: refreshToken,
        address: user.address
      });
      */

      res.status(200).send({
        id: user._id,
        accessToken: token,
        refreshToken: refreshToken,
        role: authorities,
      });
    });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;

  if (requestToken == null) {
    return res.status(403).json({ message: 'Refresh Token is required!' });
  }

  try {
    const refreshToken = await RefreshToken.findOne({ token: requestToken });

    if (!refreshToken) {
      res.status(403).json({ message: 'Refresh token is not in database!' });
      return;
    }

    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.findByIdAndRemove(refreshToken._id,
        { useFindAndModify: false })
        .exec();

      res.status(403).json({
        message: 'Refresh token was expired. Please make a new signin request',
      });
      return;
    }

    const newAccessToken = jwt.sign({ id: refreshToken.user._id },
      config.secret, {
      expiresIn: config.jwtExpiration,
    });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: refreshToken.token,
    });
  } catch (err) {
    return res.status(500).send({ message: err });
  }
};

// generateChallenge
exports.generateChallenge = async (req, res) => {

  const challenge = crypto.randomBytes(32).toString('hex');

  res.status(200).send({
    challenge: challenge,
  });
};

exports.tezosSignUp = async (req, res) => {
  const address = req.body.address;

  const username = Math.random().toString(36).substring(7);

  const chain = new Chain({
    name: 'tezos',
    address: address
  });

  const chainId = chain._id;

  const user = new User({
    address: address,
    username: username,
    email: "",
    password: "",
    imageUrl: "",
    chain: [chainId],
  });

  const role = await Role.findOne({ name: 'user' });
  user.role = [role._id];

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return res.status(200).send(false);
    }

    // return true if user is created
    res.status(200).send(true);
  });

};

// verifySignature
exports.verifyTezosSignature = async (req, res) => {
  const challenge = req.body.challenge;
  const signature = req.body.signature;
  const publicKey = req.body.publicKey;

  const address = req.body.address;

  const user = await User.findOne({
    address: address
  });

  try {
    const isValid = verifySignature(challenge, signature, publicKey);

    if (isValid) {
      var token = jwt.sign({
        id: user._id,
        address: user.address
      }, config.secret, {
        expiresIn: config.jwtExpiration, // 24 hours
      });
      
      let refreshToken = await RefreshToken.createToken(user);

      var authorities = [];

      for (let i = 0; i < user.role.length; i++) {
        authorities.push("ROLE_" + user.role[i].name.toUpperCase());
      }
    
      res.status(200).send({
        id: user._id,
        accessToken: token,
        refreshToken: refreshToken,
        role: authorities,
      });
    } else {
      res.status(401).send({
        message: 'Invalid Signature'
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err
    })
  }

};
exports.editProfile = (req, res) => {
  if (!req.body.username) {
    return res.status(400).send({
      message: 'Nothing to update',
    });
  }

  const userId = req.body.id;
  const slug = req.body.username.toLowerCase().replace(/ /g, '-');

  User.findByIdAndUpdate(userId, {
    username: req.body.username,
    slug: slug,
    email: req.body.email,
    imageUrl: req.body.imageUrl,
    // bannerUrl: req.body.bannerUrl,
    website: req.body.website,
    headline: req.body.headline,
    bio: req.body.bio,
    // twitter: req.body.twitter,
    instagram: req.body.instagram,
    // discord: req.body.discord,
  }, { new: false })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: 'User not found',
        });
      }
      if (user.email !== req.body.email) {
        user.verified = false;
        await user.save();

        // mail.sendVerificationEmail(user, req, res);
      }

      /*
  const sections = req.body.section;

  // add section to user
  if (sections.length > 0) {
    sections.forEach(async (section) => {
      await user.section.push(section);
    });
  }

  await user.save();
  */
      res.send({
        id: user._id,
      });
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error editing profile id ' + req.body.id,
      });
    });
};

// Edit profile headline
exports.editProfileHeadline = (req, res) => {
  const userId = req.userId;

  const headline = req.body.headline;

  User.findByIdAndUpdate(userId, {
    headline: headline,
  }, { new: true })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: 'User not found',
        });
      }

      res.send({
        headline: user.headline,
      });
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error editing profile id ' + req.body.id,
      });
    });
};

// Edit Profile Bio
exports.editProfileBio = (req, res) => {
  const userId = req.userId;

  const bio = req.body.bio;

  User.findByIdAndUpdate(userId, {
    bio: bio,
  }, { new: true })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: 'User not found',
        });
      }

      res.send({
        bio: user.bio,
      });
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error editing profile id ' + req.body.id,
      });
    });
};

// edit Profile Image
exports.editProfileImage = (req, res) => {
  const userId = req.userId;

  const imageUrl = req.body.imageUrl;

  User.findByIdAndUpdate(userId, {
    imageUrl: imageUrl,
  }, { new: true })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: 'User not found',
        });
      }

      res.send({
        imageUrl: user.imageUrl,
      });
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error editing profile id ' + req.body.id,
      });
    });
};

exports.changeUsername = (req, res) => {

  if (!req.body.username) {
    return res.status(400).send({
      message: 'Nothing to update',
    });
  }
  const slug = req.body.username.toLowerCase().replace(/ /g, '-');
  User.findByIdAndUpdate(req.userId, {
    username: req.body.username,
    slug: slug,
  }, { new: true })
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: 'User not found',
        });
      }

      res.status(200).send({
        id: user._id,
        username: user.username,
        slug: user.slug,
      });
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error updating user with id ' + req.userId,
      });
    });
};

exports.changeMedium = async (req, res) => {

  const userId = req.userId;

  const mediums = req.body.mediums;

  const mediumsPromise = mediums.map(async (medium) => {
    const mediumObj = await Medium.findOne({
      name: medium,
    })

    if (!mediumObj) {
      const newMedium = new Medium({
        name: medium,
      });

      await newMedium.save();
      return newMedium._id;
    }

    if (mediumObj) {
      return mediumObj._id;
    }

  });

  const mediumIds = await Promise.all(mediumsPromise);

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  user.mediums = mediumIds;

  await user.save();

  res.status(200).send({
    id: user._id,
    mediums: mediums,
  });


};



exports.changeEmail = async (req, res) => {
  if (!req.body.email) {
    return res.status(400).send({
      message: 'Nothing to update',
    });
  }
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  const oldMail = user.email;

  user.email = req.body.email;

  if (oldMail !== req.body.email) {
    user.verified = false;

    // mail.sendVerificationEmail(user, req, res);
  }

  await user.save();

  res.status(200).send({
    id: user._id,
    email: user.email,
    verified: user.verified,
  });
};

// addWallet
exports.addWallet = async (req, res) => {
  const userId = req.userId;

  const address = req.body.address;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  user.address = address;

  await user.save();

  res.status(200).send({
    id: user._id,
    address: user.address,
  });
};

// remove address
exports.removeAddress = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  user.address = '';

  await user.save();

  res.status(200).send({
    id: user._id,
  });
};

// editProfileWebsite
exports.editProfileWebsite = async (req, res) => {
  const userId = req.userId;

  const website = req.body.website;

  if (!website || website === '') {
    return res.status(400).send({
      message: 'No Website provided',
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  user.website = website;

  await user.save();


  res.status(200).send({
    id: user._id,
    website: user.website,
  });
};

exports.definePassword = async (req, res) => {
  if (!req.body.password) {
    return res.status(400).send({
      message: 'No Password provided',
    });
  }

  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  user.password = bcrypt.hashSync(req.body.password, 8);

  await user.save();

  res.status(200).send({
    id: user._id,
  });
};

exports.loginWithPassword = async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  }).populate('role', '-__v');

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  if (user.password === undefined || user.password === '') {
    return res.status(401).send({
      message: 'User has no password',
    });
  }

  if (user.emailToken !== req.body.token) {
    return res.status(401).send({
      message: 'Invalid Token',
    });
  }

  const passwordIsValid = bcrypt.compareSync(
    req.body.password,
    user.password,
  );

  if (!passwordIsValid) {
    return res.status(401).send({
      accessToken: null,
      message: 'Invalid Password!',
    });
  }

  const token = jwt.sign({ id: user._id }, config.secret, {
    expiresIn: config.jwtExpiration, // 24 hours
  });

  const refreshToken = await RefreshToken.createToken(user);

  var authorities = [];

  for (let i = 0; i < user.role.length; i++) {
    authorities.push("ROLE_" + user.role[i].name.toUpperCase());
  }

  res.status(200).send({
    id: user._id,
    accessToken: token,
    refreshToken: refreshToken,
    role: authorities,
  });

  // sendMail('info@function.gallery', user, 'adminLogin');
};

exports.adminEditUser = (req, res) => {
  if (!req.body.username) {
    return res.status(400).send({
      message: 'Nothing to update',
    });
  }

  const userId = req.body.id;

  const slug = req.body.username.toLowerCase().replace(/ /g, '-');

  User.findByIdAndUpdate(userId, {
    username: req.body.username,
    slug: slug,
    email: req.body.email,
    channelId: req.body.channelId,
    cardinalAddress: req.body.cardinalAddress,
    ordinalAddress: req.body.ordinalAddress,
    imageUrl: req.body.imageUrl,
    bannerUrl: req.body.bannerUrl,
    website: req.body.website,
    headline: req.body.headline,
    bio: req.body.bio,
  }, { new: true })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: 'User not found',
        });
      }
      const sections = req.body.section;

      // add section to user
      if (sections.length > 0) {
        sections.forEach(async (section) => {
          await user.section.push(section);
        });
      }

      await user.save();
      res.send({
        id: user._id,
      });
    }).catch((err) => {
      return res.status(500).send({
        message: 'Error editing profile id ' + req.body.id,
      });
    });
};

/*
exports.fetchArtists = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    User.find({}).populate('role', '-__v').exec((err, user) => {
      if (!user) {
        return resolve([]);
      }

      const userObj = [];
      for (const usr of user) {
        userObj.push({
          id: usr._id,
          username: usr.username,
          address: usr.address,
          bannerUrl: usr.bannerUrl,
          imageUrl: usr.imageUrl,
          role: usr.role,
          website: usr.website,
          headline: usr.headline,
          bio: usr.bio,
          twitter: usr.twitter,
          whitelisted: usr.whitelisted,
          verified: usr.verified,
        });
      }

      resolve(userObj);
      if (err) reject(err);
    });
  });
  return promise;
};

exports.fetchArtistById = (req, res) => {
  const promise = new Promise((resolve, reject) => {
    User.findById(req.params.id).populate('role', '-__v').exec((err, user) => {
      if (!user) {
        return resolve({});
      }

      const userObj = {
        id: user._id,
        username: user.username,
        address: user.address,
        bannerUrl: user.bannerUrl,
        imageUrl: user.imageUrl,
        role: user.role,
        website: user.website,
        headline: user.headline,
        bio: user.bio,
        twitter: user.twitter,
        whitelisted: user.whitelisted,
        verified: user.verified,
      };

      resolve(userObj);
      if (err) reject(err);
    });
  });
  return promise;
};
*/

// delete all user comments

exports.deleteUserComments = async (req, res) => {
  const id = req.body.id;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  for (const comment of user.comments) {
    await Comment.findByIdAndRemove(comment);
  }

  user.comments = [];
  await user.save();

  res.status(200).send({
    message: 'Comments deleted',
  });
};

exports.changeUserRole = async (req, res) => {
  const id = req.userId;
  const roleId = req.body.role;

  let user = await User.findOne({
    _id: id,
  });

  user.role.push(roleId);
  await user.save();

  user = await User.findById(id).populate('role', '-__v');

  const authorities = [];

  for (const role of user.role) {
    authorities.push({
      id: role._id,
      name: 'ROLE_' + role.name.toUpperCase(),
    });
  }

  res.status(200).send({
    role: authorities,
  });
};

// remove user role
exports.removeUserRole = async (req, res) => {
  const id = req.userId;
  const roleId = req.params.id;

  let user = await User.findOne({
    _id: id,
  });

  user.role.pull(roleId);
  await user.save();

  res.status(200).send({
    roleId: roleId,
  });
}

// admin delete user
exports.deleteUserById = async (req, res) => {
  const id = req.params.id;

  // delete user
  await User.deleteOne({
    _id: id,
  });

  res.status(200).send({
    message: 'User deleted',
  });
};

// delete user and all his data
exports.deleteUser = async (req, res) => {
  const id = req.userId;


  // delete user
  await User.deleteOne({
    _id: id,
  });

  res.send({ message: 'User was deleted successfully!' });
};

// User forgot password
exports.forgotPassword = async (req, res) => {
  if (!req.body.email) {
    return res.status(400).send({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }

    // send recovery email
    const emailSent = mail.sendRecoveryEmail(user, req, res);

    if (!emailSent) {
      return res.status(500).send({ message: 'Error sending email' });
    }

    res.status(200).send({
      message: 'Recovery email sent',
    });
  } catch (error) {
    res.status(500).send({ message: error });
  }
};



// verify recover password token from email
exports.recover = async (req, res) => {
  if (!req.params.token) {
    return res.status(400)
      .json({ message: 'We were unable to find a user for this token.' });
  }

  try {
    // Find a matching token
    const token = await Token.findOne({ token: req.params.token });

    if (!token) {
      return res.status(400)
        .json({ message: 'We were unable to find a valid token' });
    }

    // If we found a token, find a matching user
    const user = await User.findOne({ _id: token.userId });

    if (!user) {
      return res.status(400)
        .json({ message: 'We were unable to find a user for this token.' });
    }

    // replace user password by a generated one
    const password = crypto.randomBytes(20).toString('hex');
    user.password = bcrypt.hashSync(password, 8);

    // Save the new password
    await user.save();

    // send email with new password
    const emailSent = mail.sendNewPassword(user, password, req, res);

    if (!emailSent) {
      return res.status(500).send({ message: 'Error sending email' });
    }

    res.redirect(`${CLIENT_URL}user/profile`);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.verify = async (req, res) => {
  if (!req.params.token) {
    return res.status(400)
      .json({ message: 'We were unable to find a user for this token.' });
  }

  try {
    // Find a matching token
    const token = await Token.findOne({ token: req.params.token });

    if (!token) {
      return res.status(400)
        .json({ message: 'We were unable to find a valid token' });
    }

    // If we found a token, find a matching user
    User.findOne({ _id: token.userId }, (err, user) => {
      if (!user) {
        return res.status(400)
          .json({ message: 'We were unable to find a user for this token.' });
      }

      if (user.verified) {
        return res.status(400)
          .json({ message: 'This user has already been verified.' });
      }

      // Verify and save the user
      user.verified = true;
      user.save(function (err) {
        if (err) return res.status(500).json({ message: err.message });

        res.redirect(`${CLIENT_URL}user/edit`);
        /*
        res.status(200).send(
            `
        <html>
          <head>
            <title>The Function Gallery</title>
            <style>
              body {
                text-align: center;
                font-family: Montserrat, Playfair Display, serif;
                background-color: #F2F0EC;
                color: #212123;
              }
              img {
                width: 200px;
                height: auto;
              }
              h1 {
                font-size: 2rem;
              }
              p {
                font-size: 1.5rem;
              }
              a {
                color: #212123;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <img src="${BASE_URL}icons/function_logo_black.png"
            alt="Function Gallery Logo">
            <h1>The Function Gallery</h1>
            <p>Verification successful!</p>
            <a href="${CLIENT_URL}user/edit">
            Click here to go back to The Function Gallery
            </a>
          </body>

        </html>
          `,
        ); */
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyAuthenticationEmail = async (req, res) => {
  if (!req.params.token) {
    return res.status(400)
      .json({ message: 'We were unable to find a user for this token.' });
  }

  try {
    const auth = await Auth.findOne({ token: req.params.token });

    if (!auth) {
      return res.status(400)
        .json({ message: 'We were unable to find a valid token' });
    }

    User.findOne({ _id: auth.userId }, (err, user) => {
      if (!user) {
        return res.status(400)
          .json({ message: 'We were unable to find a user for this token.' });
      }

      const emailToken = crypto.randomBytes(20).toString('hex');

      user.emailToken = emailToken;
      user.save(async function (err) {
        if (err) return res.status(500).json({ message: err.message });

        var token = jwt.sign({ id: user.id }, config.secret, {
          expiresIn: config.jwtExpiration, // 24 hours
        });
  
        let refreshToken = await RefreshToken.createToken(user);
  
        var authorities = [];
  
        for (let i = 0; i < user.role.length; i++) {
          authorities.push(user.role[i].name);
        }

        const userObj = {
          id: user._id,
          accessToken: token,
          refreshToken: refreshToken,
          role: authorities,
        };


        res.cookie('user', JSON.stringify(userObj), { httpOnly: true });
        res.redirect(`${CLIENT_URL}`);
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.sendVerificationEmail = async (req, res) => {
  const id = req.userId;

  User.findById(id, (err, user) => {
    if (err) return res.status(500).json({ message: err.message });

    mail.sendVerificationEmail(user, req, res);
  });

  res.status(200).send({
    message: 'Verification email sent',
  });
};
/*
exports.sendAuthenticationEmail = async (req, res) => {
  const email = req.body.email;

  User.findOne({ email: email }, (err, user) => {
    if (err) return res.status(500).json({ message: err.message });

    mail.sendAuthenticationEmail(user, req, res);
  });
};
*/

exports.sendAuthenticationEmail = async (req, res) => {
  const email = req.body.email;

  let user;

  user = await User.findOne({ email: email });

  // if user does not exist create new user
  if (!user) {
    const username = Math.random().toString(36).substring(7);

    user = new User({
      username: username,
      email: email,
    });

    await user.save();
  }

  mail.sendAuthenticationEmail(user, req, res);

};

exports.helpVisible = async (req, res) => {
  const id = req.sessionId;
  const state = req.body.state;

  const session = await Session.findOne({ sessionId: id });

  if (!session) {
    return res.status(404).send({
      message: 'Session not found',
    });
  }

  session.helpOff = state;
  await session.save();

  res.status(200).send({
    helpOff: session.helpOff,
  });
};

exports.getSession = async (req, res) => {
  const id = req.sessionId;

  const session = await Session.findOne({ sessionId: id });

  if (!session) {
    return res.status(404).send({
      message: 'Session not found',
    });
  }

  res.status(200).send({
    helpOff: session.helpOff,
  });
};

/**
 * Sends an email.
 *
 * @param {string} to - The email address to send to.
 * @param {Object} data - The data to include in the email.
 * @param {string} type - The type of email to send.
 */
function sendMail(to, data, type) {
  const options = mail.getMailOptions(to, data, type);

  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}
