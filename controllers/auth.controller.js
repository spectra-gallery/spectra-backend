const config = require("../config/auth.config");
const sessionConfig = require("../config/session.config");
const sorageConfig = require("../config/storage.config");
const mail = require("../middlewares/mail");
const {
  sendVerificationEmail,
  sendRecoveryEmail,
  sendNewPassword,
  sendAuthenticationEmail,
} = require("../services/mail.service");

const { encodeString, decodeString, encryptString, decryptString } = require("../helpers/cypher.helpers");
// const discord = require('../middlewares/discord');
require("dotenv").config();
const User = require("../models/user.model");
const Medium = require("../models/medium.model");
const Comment = require("../models/comment.model");
const Token = require("../models/token.model");
const Role = require("../models/role.model");
const Session = require("../models/session.model");
const RefreshToken = require("../models/refreshToken.model");
const SessionRefreshToken = require("../models/sessionRefreshToken.model");
const Auth = require("../models/auth.model");
const Chain = require("../models/chain.model");
const Bitcoin = require("../models/bitcoin.model");
const Customer = require("../models/customer.model");
const Trait = require("../models/trait.model");
const Theme = require("../models/theme.model");
const Palette = require("../models/palette.model");

const bitcoin = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");

const mainnet = bitcoin.networks.bitcoin;

bitcoin.initEccLib(ecc);

const bitcoinMessage = require("bitcoinjs-message");

const { verifyMessage } = require("@unisat/wallet-utils");

const { Verifier } = require("bip322-js");

const walletController = require("./wallet.controller");

var ethUtil = require("ethereumjs-util");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const crypto = require("crypto");

const { TezosToolkit } = require("@taquito/taquito");
const { verifySignature } = require("@taquito/utils");
const { frequentWords } = require("./user.controller");

const { CLIENT_URL } = require("../config/app.cypher.config");
// const BASE_URL = process.env.BASE_URL;

/* verify user credentials to access a protected route */
exports.validateToken = (req, res) => {
  // check if user with given id exists in db if doesn't exist return 401 false
  User.findById(req.userId)
    .populate("role", "-__v")
    .exec(async (err, user) => {
      if (!user) {
        return res.status(403).send({ ok: false, error: { code: 'forbidden', message: 'invalid_user' }, reqId: req.context && req.context.id });
      }
      res.status(200).send({ ok: true, data: true, reqId: req.context && req.context.id });
    });
};

/* populate user object on the front end using state managment */
// get User data from id
exports.getUserData = (req, res) => {
  User.findById(req.userId)
    .populate("role", "-__v")
    .populate("trait", "-__v")
    .populate("bitcoin", "_id cardinalAddress ordinalAddress")
    .populate("section", "-__v")
    .populate("twitter", "-__v")
    .populate("discord", "-__v")
    .populate("mediums", "-__v")
    .populate("frequentWords", "-__v")
    .exec(async (err, user) => {
      if (!user) {
        return res.status(403).send({ ok: false, error: { code: 'forbidden', message: 'invalid_user' }, reqId: req.context && req.context.id });
      }

      const authorities = [];

      for (const role of user.role) {
        authorities.push({
          id: role._id,
          name: "ROLE_" + role.name.toUpperCase(),
        });
      }

      // if user found return true
      const payload = {
        id: user._id,
        username: user.username,
        slug: user.slug,
        email: user.email,
        address: user.address,
        role: authorities,
        bitcoin: user.bitcoin,
        imageUrl: user.imageUrl,
        website: user.website,
        headline: user.headline,
        bio: user.bio,
        trait: user.trait,
        mediums: user.mediums,
        twitter: user.twitter,
        instagram: user.instagram,
        discord: user.discord,
        bluesky: user.bluesky,
        whitelisted: user.whitelisted,
        verified: user.verified,
        applied: user.applied,
        customer: user.customer,
        views: user.views,
        volume: user.volume,
        creator: user.creator,
        date: user.date,
        lastLogin: user.lastLogin,
        _2FA_enabled: user._2FA_enabled,
        _2FA_registered: user._2FA_registered,
        like: user.like,
        likes: user.likes,
        frequentWords: user.frequentWords,
      };
      res.status(200).send({ ok: true, data: payload, ...payload, reqId: req.context && req.context.id });
    });
};

exports.generateStorageToken = (req, res) => {
  const slug = req.body.slug;

  const token = jwt.sign({ id: req.userId, slug }, sorageConfig.secret, {
    expiresIn: sorageConfig.jwtExpiration, // 24 hours
  });

  res.status(200).send({
    storageToken: token,
  });
};

// generate session token for client
exports.generateSessionToken = async (req, res) => {
  const sessionId = crypto.randomBytes(16).toString("base64");

  const token = jwt.sign({ id: sessionId }, sessionConfig.secret, {
    expiresIn: sessionConfig.jwtExpiration, // 24 hours
  });

  // save session token in database
  const session = new Session({
    sessionId: sessionId,
    ip: [req.clientIP]
  });

  await session.save();

  // create refresh token
  const refreshToken = await SessionRefreshToken.createToken(session);

  if (!refreshToken) {
    return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'refresh_token_failed' }, reqId: req.context && req.context.id });
  }

  const payload = { sessionId, sessionToken: token, sessionRefresh: refreshToken };
  res.status(200).send({ ok: true, data: payload, ...payload, reqId: req.context && req.context.id });
};

// get last 10 sessions
exports.getSessions = (req, res) => {
  Session.find()
    .sort({ date: -1 })
    .limit(10)
    .exec((err, sessions) => {
      if (err) {
        res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(err) }, reqId: req.context && req.context.id });
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

      res.status(200).send({ ok: true, data: _sessions, sessions: _sessions, reqId: req.context && req.context.id });
    });
};

exports.isWeb3Registered = async (req, res) => {
  // check if user address is in database return true or false

  const user = await User.findOne({
    address: req.params.address,
  });

  const registered = Boolean(user);
  res.status(200).send({ ok: true, data: { registered }, registered, reqId: req.context && req.context.id });
};

exports.registerWeb3 = async (req, res) => {
  try {
    // generate a random username
    const username = Math.random().toString(36).substring(7);

    // If already registered, return quickly (idempotent)
    const existingUser = await User.findOne({ address: req.body.address });
    if (existingUser) {
      return res.status(200).send({ ok: true, data: { registered: true }, registered: true, reqId: req.context && req.context.id });
    }

    const chain = new Chain({
      name: "ethereum",
      address: req.body.address,
    });
    await chain.save();

    const user = new User({
      address: req.body.address,
      username,
      email: "",
      password: "",
      imageUrl: "",
      chain: [chain._id],
    });

    // assign base role
    let baseRole = await Role.findOne({ name: "user" });
    if (!baseRole) { baseRole = await Role.create({ name: 'user' }); }
    user.role = [baseRole._id];

    // first user bootstrap: grant admin
    const existing = await User.countDocuments({});
    if (existing === 0) {
      let adminRole = await Role.findOne({ name: 'admin' });
      if (!adminRole) { adminRole = await Role.create({ name: 'admin' }); }
      user.role.push(adminRole._id);
    }

    await user.save();
    return res.status(200).send({ ok: true, data: { registered: true }, registered: true, reqId: req.context && req.context.id });
  } catch (err) {
    return res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(err && err.message ? err.message : err) }, reqId: req.context && req.context.id });
  }
};

exports.getNonce = async (req, res) => {
  // get nonce from user
  const user = await User.findOne({
    address: req.params.address,
  });

  if (user) {
    res.status(200).send({ ok: true, data: { nonce: user.nonce }, nonce: user.nonce, reqId: req.context && req.context.id });
  } else {
    res.status(200).send({ ok: true, data: false, reqId: req.context && req.context.id });
  }
};

exports.getBtcNonce = async (req, res) => {
  const bitcoin = await Bitcoin.findOne({
    cardinalAddress: req.params.address,
  });

  if (!bitcoin) {
    return res.status(404).send({
      message: "Address not found",
    });
  }

  const user = await User.findOne({
    bitcoin: bitcoin._id,
  });

  if (user) {
    res.status(200).send({
      nonce: user.nonce,
    });
  } else {
    res.status(200).send(false);
  }
};

exports.web3Login = async (req, res) => {
  // get user from database
  const user = await User.findOne({
    address: req.body.address,
  }).populate("role", "-__v");

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
        if (err) { try { console.error('nonce_save_error', err); } catch (_) {} }
      });

      var token = jwt.sign(
        {
          id: user._id,
          address: user.address,
        },
        config.secret,
        {
          expiresIn: config.jwtExpiration, // 24 hours
        }
      );

      let refreshToken = await RefreshToken.createToken(user);

      var authorities = [];

      for (let i = 0; i < user.role.length; i++) {
        authorities.push("ROLE_" + user.role[i].name.toUpperCase());
      }

      res.status(200).send({ ok: true, data: { id: user._id, accessToken: token, refreshToken: refreshToken, role: authorities }, id: user._id, accessToken: token, refreshToken: refreshToken, role: authorities, reqId: req.context && req.context.id });
    } else {
      res.status(401).send({ ok: false, error: { code: 'invalid_credentials', message: 'Invalid credentials' }, reqId: req.context && req.context.id });
    }
  } else {
    res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });
  }
};

exports.registerNewUser = async (req, res) => {
  // create new user with address

  const bitcoin = new Bitcoin({
    cardinalAddress: req.body.cardinalAddress,
    ordinalAddress: req.body.ordinalAddress,
  });

  await bitcoin.save();

  const slug = req.body.username.toLowerCase().replace(/ /g, "-");
  const user = new User({
    bitcoin: bitcoin._id,
    username: req.body.username,
    slug: slug,
    email: "",
    password: "",
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

  // assign roles prior to save (first-user bootstrap)
  let baseRole = await Role.findOne({ name: 'user' });
  if (!baseRole) { baseRole = await Role.create({ name: 'user' }); }
  user.role = [baseRole._id];
  const existing = await User.countDocuments({});
  if (existing === 0) {
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) { adminRole = await Role.create({ name: 'admin' }); }
    user.role.push(adminRole._id);
  }

  try {
    await user.save();
    return res.status(200).send({ ok: true, data: { registered: true }, registered: true, reqId: req.context && req.context.id });
  } catch (e) {
    return res.status(200).send({ ok: false, data: { registered: false }, registered: false, reqId: req.context && req.context.id });
  }
};

exports.signup = async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      isVerified: false,
      password: bcrypt.hashSync(req.body.password, 8),
    });

    // Resolve roles (default to "user"). If explicit roles are provided, map them.
    if (Array.isArray(req.body.role) && req.body.role.length > 0) {
      const roles = await Role.find({ name: { $in: req.body.role } }).exec();
      user.role = roles.map((r) => r._id);
    } else {
      let role = await Role.findOne({ name: 'user' }).exec();
      if (!role) role = await Role.create({ name: 'user' });
      user.role = [role._id];
    }

    await user.save();

    // Optional: send verification email in future
    // await sendVerificationEmail(user, req, res)

    return res.status(200).send({ ok: true, data: { registered: true }, registered: true, message: 'User was registered successfully!', reqId: req.context && req.context.id });
  } catch (err) {
    return res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(err && err.message ? err.message : err) }, reqId: req.context && req.context.id });
  }
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
    email: req.body.email,
  })
    .populate("role", "-__v")
    .select("+password")
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
          message: "Invalid Password!",
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

exports.refreshSessionToken = async (req, res) => {
  const { refreshSessionToken: requestSessionToken } = req.body;

  if (requestSessionToken == null) {
    return res.status(403).json({ message: "Session Token is required!" });
  }

  try {
    const sessionToken = await SessionRefreshToken.findOne({
      token: requestSessionToken,
    });

    if (!sessionToken) {
      res.status(403).json({ message: "Session token is not in database!" });
      return;
    }

    if (SessionRefreshToken.verifyExpiration(sessionToken)) {
      SessionRefreshToken.findByIdAndRemove(sessionToken._id, {
        useFindAndModify: false,
      }).exec();

      res.status(403).json({
        message: "Session token was expired",
      });

      return;
    }

      const newSessionToken = jwt.sign(
        { id: sessionToken.sessionId },
        sessionConfig.secret,
        {
          expiresIn: sessionConfig.jwtExpiration,
        }
      );

      return res.status(200).json({
        sessionToken: newSessionToken,
        sessionRefresh: sessionToken.token,
      });

    } catch (err) {
      return res.status(500).send({ message: err });

    }
};
      


exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;

  if (requestToken == null) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }

  try {
    const refreshToken = await RefreshToken.findOne({ token: requestToken });

    if (!refreshToken) {
      res.status(403).json({ message: "Refresh token is not in database!" });
      return;
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
  const challenge = crypto.randomBytes(32).toString("hex");

  res.status(200).send({
    challenge: challenge,
  });
};

exports.tezosSignUp = async (req, res) => {
  const address = req.body.address;

  const username = Math.random().toString(36).substring(7);

  const chain = new Chain({
    name: "tezos",
    address: address,
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

  const role = await Role.findOne({ name: "user" });
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
    address: address,
  });

  try {
    const isValid = verifySignature(challenge, signature, publicKey);

    if (isValid) {
      var token = jwt.sign(
        {
          id: user._id,
          address: user.address,
        },
        config.secret,
        {
          expiresIn: config.jwtExpiration, // 24 hours
        }
      );

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
        message: "Invalid Signature",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err,
    });
  }
};

exports.bitcoinLogin = async (req, res) => {
  const address = req.body.cardinalAddress;
  const signature = req.body.signature;
  const publicKey = req.body.publicKey;
  const wallet = req.body.wallet;

  let bitcoin = await Bitcoin.findOne({
    cardinalAddress: address,
  });

  if (!bitcoin) {
    // if address is not found in database try ordinal address
    bitcoin = await Bitcoin.findOne({
      ordinalAddress: address,
    });

    if (!bitcoin) {
      // no address found
      return res.status(404).send({
        message: "Address not found",
      });
    }
  }

  // get user from database
  const user = await User.findOne({
    bitcoin: bitcoin._id,
  }).populate("role", "-__v");

  if (user) {
    const message =
      "Login to Spectra Gallery. \n nonce: " +
      user.nonce +
      "\n address: " +
      bitcoin.cardinalAddress;

    // hash message

    let valid = false;

    // get address type
    const isP2SHAddress = walletController.isP2SHAddress(address, mainnet);
    const isBech32Address = walletController.isBech32(address);

    if (wallet === "xverse") {
      if (isP2SHAddress) {
        valid = bitcoinMessage.verify(message, address, signature);
      } else if (isBech32Address) {
        valid = Verifier.verifySignature(address, message, signature);
      }
    } else if (wallet === "hiro") {
      // verify BIP-322 messages
      valid = Verifier.verifySignature(address, message, signature);
    } else if (wallet === "unisat") {
      valid = verifyMessage(publicKey, message, signature);
    }

    if (valid) {
      // Change user nonce
      user.nonce = Math.floor(Math.random() * 1000000);
      user.lastLogin = new Date().toISOString();
      await user.save();

      const token = jwt.sign(
        {
          id: user._id,
          address: user.cardinalAddress || user.ordinalAddress,
        },
        config.secret,
        {
          expiresIn: config.jwtExpiration, // 24 hours
        }
      );

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
    } else {
      // User is not authenticated
      res.status(401).send({
        message: "Invalid signature",
      });
    }
  } else {
    res.send({
      message: "User does not exist",
    });
  }
};

exports.isBitcoinRegistered = async (req, res) => {
  let bitcoin = await Bitcoin.findOne({
    cardinalAddress: req.params.address,
  });

  if (!bitcoin) {
    bitcoin = await Bitcoin.findOne({
      ordinalAddress: req.params.address,
    });

    if (!bitcoin) {
      return res.status(200).send({
        registered: false,
      });
    }
  }

  const user = await User.findOne({
    bitcoin: bitcoin._id,
  });

  if (user) {
    res.status(200).send({
      registered: true,
    });
  } else {
    res.status(200).send({
      registered: false,
    });
  }
};

exports.registerBitcoin = async (req, res) => {
  // create new user with address

  // generate a random username
  const username = Math.random().toString(36).substring(7);

  const slug = username.toLowerCase().replace(/ /g, "-");

  const bitcoin = new Bitcoin({
    cardinalAddress: req.body.cardinalAddress,
    ordinalAddress: req.body.ordinalAddress,
    cardinalPublicKey: req.body.cardinalPublicKey,
    ordinalPublicKey: req.body.ordinalPublicKey,
  });

  await bitcoin.save();

  const user = new User({
    bitcoin: bitcoin._id,
    username: username,
    slug: slug,
    email: "",
    password: "",
    imageUrl: "",
  });

  // Assign roles with first-user bootstrap
  let baseRole = await Role.findOne({ name: 'user' });
  if (!baseRole) { baseRole = await Role.create({ name: 'user' }); }
  user.role = [baseRole._id];
  const existing = await User.countDocuments({});
  if (existing === 0) {
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) { adminRole = await Role.create({ name: 'admin' }); }
    user.role.push(adminRole._id);
  }

  try {
    await user.save();
    return res.status(200).send({ ok: true, data: { registered: true }, registered: true, reqId: req.context && req.context.id });
  } catch (e) {
    return res.status(200).send({ ok: false, data: { registered: false }, registered: false, reqId: req.context && req.context.id });
  }
};

exports.connectBitcoinAddress = async (req, res) => {
  const userId = req.userId;

  let bitcoin = await Bitcoin.findOne({
    cardinalAddress: req.body.cardinalAddress,
  });

  if (bitcoin) {
    return res.status(400).send({
      message: "Address already exists",
    });
  }
  const newBitcoin = new Bitcoin({
    cardinalAddress: req.body.cardinalAddress,
    ordinalAddress: req.body.ordinalAddress,
    cardinalPublicKey: req.body.cardinalPublicKey,
    ordinalPublicKey: req.body.ordinalPublicKey,
  });

  await newBitcoin.save();

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  user.bitcoin = newBitcoin._id;

  await user.save();

  res.status(200).send({
    id: user._id,
    bitcoin: newBitcoin,
  });
};

exports.removeBtcAddress = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  if (!user.address && user.email === "") {
    return res.status(404).send({
      message: "User has no address",
    });
  }

  const bitcoin = await Bitcoin.findById(user.bitcoin);

  await bitcoin.remove();

  user.bitcoin = null;

  await user.save();

  res.status(200).send({
    removed: true,
  });
};

exports.set2FASecret = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId).select("+_2FA_secret")
                    .select("+cypher")
                    .populate("cypher", "-__v");

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  if (!user._2FA_secret || user._2FA_secret === '') {
    user._2FA_registered = false;
    user._2FA_enabled = false;

    // remove cypher
    if (user.cypher) {
      await user.cypher.remove();
    }
  }

  const encodedSecret = encodeString(req.body.secret);

  user._2FA_secret = encodedSecret;

  await user.save();  

  res.status(200).send({
    secret: req.body.secret,
  });
};

exports.editProfile = (req, res) => {
  if (!req.body.username) {
    return res.status(400).send({
      message: "Nothing to update",
    });
  }

  const userId = req.body.id;
  const slug = req.body.username.toLowerCase().replace(/ /g, "-");

  User.findByIdAndUpdate(
    userId,
    {
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
    },
    { new: false }
  )
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: "User not found",
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
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Error editing profile id " + req.body.id,
      });
    });
};

// Edit profile headline
exports.editProfileHeadline = (req, res) => {
  const userId = req.userId;

  const headline = req.body.headline;

  User.findByIdAndUpdate(
    userId,
    {
      headline: headline,
    },
    { new: true }
  )
    .then(async (user) => {
      if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });
      res.send({ ok: true, data: { headline: user.headline }, headline: user.headline, reqId: req.context && req.context.id });
    })
    .catch((err) => {
      return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'edit_headline_failed' }, reqId: req.context && req.context.id });
    });
};

// Edit Profile Bio
exports.editProfileBio = (req, res) => {
  const userId = req.userId;

  const bio = req.body.bio;

  User.findByIdAndUpdate(
    userId,
    {
      bio: bio,
    },
    { new: true }
  )
    .then(async (user) => {
      if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });
      res.send({ ok: true, data: { bio: user.bio }, bio: user.bio, reqId: req.context && req.context.id });
    })
    .catch((err) => {
      return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'edit_bio_failed' }, reqId: req.context && req.context.id });
    });
};

// edit Profile Image
exports.editProfileImage = (req, res) => {
  const userId = req.userId;

  const imageUrl = req.body.imageUrl;

  User.findByIdAndUpdate(
    userId,
    {
      imageUrl: imageUrl,
    },
    { new: true }
  )
    .then(async (user) => {
      if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });
      res.send({ ok: true, data: { imageUrl: user.imageUrl }, imageUrl: user.imageUrl, reqId: req.context && req.context.id });
    })
    .catch((err) => {
      return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'edit_image_failed' }, reqId: req.context && req.context.id });
    });
};

exports.changeUsername = (req, res) => {
  if (!req.body.username) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'username_required' }, reqId: req.context && req.context.id });
  const slug = req.body.username.toLowerCase().replace(/ /g, "-");
  User.findByIdAndUpdate(
    req.userId,
    {
      username: req.body.username,
      slug: slug,
    },
    { new: true }
  )
    .then((user) => {
      if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });
      res.status(200).send({ ok: true, data: { id: user._id, username: user.username, slug: user.slug }, id: user._id, username: user.username, slug: user.slug, reqId: req.context && req.context.id });
    })
    .catch((err) => {
      return res.status(500).send({ ok: false, error: { code: 'internal_error', message: 'change_username_failed' }, reqId: req.context && req.context.id });
    });
};

exports.changeMedium = async (req, res) => {
  const userId = req.userId;

  const mediums = req.body.mediums;

  const mediumsPromise = mediums.map(async (medium) => {
    const mediumObj = await Medium.findOne({
      name: medium,
    });

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

  if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

  user.mediums = mediumIds;

  await user.save();

  res.status(200).send({ ok: true, data: { id: user._id, mediums }, id: user._id, mediums, reqId: req.context && req.context.id });
};

// deleteUserMedium
exports.deleteUserMedium = async (req, res) => {
  const userId = req.userId;

  const name = req.params.name;

  const user = await User.findById(userId).populate("mediums", "-__v");

  if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

  const mediums = user.mediums;

  // remove medium from user by name
  const newMediums = mediums.filter((medium) => {
    return medium.name !== name;
  });

  user.mediums = newMediums;

  await user.save();

  res.status(200).send({ ok: true, data: { id: user._id, mediums: user.mediums }, id: user._id, mediums: user.mediums, reqId: req.context && req.context.id });
};

exports.changeEmail = async (req, res) => {
  if (!req.body.email) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'email_required' }, reqId: req.context && req.context.id });
  const user = await User.findById(req.userId);

  if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

  const oldMail = user.email;

  user.email = req.body.email;

  if (oldMail !== req.body.email) {
    user.verified = false;

    sendVerificationEmail(user, req, res);
  }

  await user.save();

  res.status(200).send({ ok: true, data: { id: user._id, email: user.email, verified: user.verified }, id: user._id, email: user.email, verified: user.verified, reqId: req.context && req.context.id });
};

// addWallet
exports.addWallet = async (req, res) => {
  const userId = req.userId;

  const address = req.body.address;

  const user = await User.findById(userId);

  if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

  user.address = address;

  await user.save();

  res.status(200).send({ ok: true, data: { id: user._id, address: user.address }, id: user._id, address: user.address, reqId: req.context && req.context.id });
};

// remove address
exports.removeAddress = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  if (!user.bitcoin && user.email === "" && user.address === "") {
    return res.status(404).send({
      message: "User has no address",
    });
  }

  user.address = "";

  await user.save();

  res.status(200).send({
    id: user._id,
  });
};

// editProfileWebsite
exports.editProfileWebsite = async (req, res) => {
  const userId = req.userId;

  const website = req.body.website;

  if (!website || website === "") {
    return res.status(400).send({
      message: "No Website provided",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
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
      message: "No Password provided",
    });
  }

  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
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
  })
    .select("+pasword")
    .populate("role", "-__v");

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  if (user.password === undefined || user.password === "") {
    return res.status(401).send({
      message: "User has no password",
    });
  }

  if (user.emailToken !== req.body.token) {
    return res.status(401).send({
      message: "Invalid Token",
    });
  }

  const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);

  if (!passwordIsValid) {
    return res.status(401).send({
      accessToken: null,
      message: "Invalid Password!",
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

  // sendMail('pmosi76@gmail.com', user, 'adminLogin');
};

// export create Trait
exports.createTrait = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  let trait;

  trait = await Trait.findOne({
    trait_type: req.body.trait_type,
    value: req.body.value,
  });

  if (!trait) {
    trait = new Trait({
      trait_type: req.body.trait_type,
      value: req.body.value,
    });

    await trait.save();
  }

  user.trait = trait._id;

  await user.save();

  res.status(200).send({
    id: user._id,
    trait: trait,
  });
};

exports.removeTrait = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  user.trait = null;

  await user.save();

  res.status(200).send({
    id: user._id,
  });
};

exports.createCustomer = async (req, res) => {
  const userId = req.userId;

  const validUser = await User.findById(userId);

  if (!validUser) {
    return res.status(404).send({
      message: "User not found",
    });
  }

  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const address = req.body.address;
  const street = address.street;
  const city = address.city;
  const zip = address.zip;
  const country = address.country;

  const customer = new Customer({
    userId: userId,
    firstName: firstName,
    lastName: lastName,
    email: email,
    street: street,
    city: city,
    zip: zip,
    country: country,
  });

  await customer.save();

  validUser.customer = true;

  await validUser.save();

  const _address = {
    street: customer.street,
    city: customer.city,
    zip: customer.zip,
    country: customer.country,
  };

  const customerData = {
    id: customer._id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    address: _address,
  };

  res.status(200).send({
    id: customer._id,
    userId: customer.userId,
    customerData: customerData,
    customer: true,
  });
};

exports.loadMyCustomerData = async (req, res) => {
  const userId = req.userId;

  const customer = await Customer.findOne({
    userId: userId,
  });

  if (!customer) {
    return res.status(404).send({
      message: "Customer not found",
    });
  }

  const address = {
    street: customer.street,
    city: customer.city,
    zip: customer.zip,
    country: customer.country,
  };

  res.status(200).send({
    id: customer._id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    address: address,
  });
};

// deleteCustomer
exports.deleteCustomer = async (req, res) => {
  const userId = req.userId;

  const customer = await Customer.findOne({
    userId: userId,
  });

  if (!customer) {
    return res.status(404).send({
      message: "Customer not found",
    });
  }

  await Customer.findByIdAndRemove(customer._id);

  const user = await User.findById(userId);

  user.customer = false;

  await user.save();

  res.status(200).send({
    id: customer._id,
    customer: false,
  });
};

exports.adminEditUser = async (req, res) => {
  if (!req.body.username) {
    return res.status(400).send({
      message: "Nothing to update",
    });
  }

  const userId = req.body.id;

  const slug = req.body.username.toLowerCase().replace(/ /g, "-");

  let bitcoin = await Bitcoin.findOne({
    cardinalAddress: req.body.cardinalAddress,
  });

  if (bitcoin) {
    bitcoin.cardinalAddress = req.body.cardinalAddress;
    bitcoin.ordinalAddress = req.body.ordinalAddress;
  } else {
    if (
      req.body.cardinalAddress &&
      req.body.ordinalAddress &&
      req.body.cardinalAddress !== "" &&
      req.body.ordinalAddress !== ""
    ) {
      bitcoin = new Bitcoin({
        cardinalAddress: req.body.cardinalAddress,
        ordinalAddress: req.body.ordinalAddress,
      });
    }

    await bitcoin.save();
  }

  User.findByIdAndUpdate(
    userId,
    {
      username: req.body.username,
      slug: slug,
      email: req.body.email,
      channelId: req.body.channelId,
      bitcoin: bitcoin._id,
      imageUrl: req.body.imageUrl,
      bannerUrl: req.body.bannerUrl,
      website: req.body.website,
      headline: req.body.headline,
      bio: req.body.bio,
    },
    { new: true }
  )
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: "User not found",
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
    })
    .catch((err) => {
      return res.status(500).send({
        message: "Error editing profile id " + req.body.id,
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
      message: "User not found",
    });
  }

  for (const comment of user.comments) {
    await Comment.findByIdAndRemove(comment);
  }

  user.comments = [];
  await user.save();

  res.status(200).send({
    message: "Comments deleted",
  });
};


exports.changeUserRole = async (req, res) => {
  const id = req.userId;
  const roleId = req.body.role;

  const role = await Role.findById(roleId);

  if (!role) {
    return res.status(404).send({
      message: "Role not found",
    });
  }

  if (role.name === "admin") {
    return res.status(400).send({
      message: "Cannot change to admin",
    });
  } else if (
    role.name === "creator" ||
    role.name === "thinker" ||
    role.name === "reviewer" ||
    role.name === "myself"
  ) {
    return res.status(400).send({
      message: "Cannot change to role, Require membership request",
    });
  }

  let user = await User.findOne({
    _id: id,
  });

  const roles = user.role;

  if (roles.includes(roleId)) {
    return res.status(400).send({
      message: "User already has role",
    });
  }

  user.role.push(roleId);
  await user.save();

  user = await User.findById(id).populate("role", "-__v");

  const authorities = [];

  for (const role of user.role) {
    authorities.push({
      id: role._id,
      name: "ROLE_" + role.name.toUpperCase(),
    });
  }

  res.status(200).send({ ok: true, data: { role: authorities }, role: authorities, reqId: req.context && req.context.id });
};

// remove user role
exports.removeUserRole = async (req, res) => {
  const id = req.userId;
  const roleId = req.params.id;

  const role = await Role.findById(roleId);

  if (!role) {
    return res.status(404).send({
      message: "Role not found",
    });
  }

  if (role.name === "user") {
    return res.status(400).send({
      message: "Cannot remove user role, delete user instead",
    });
  }

  let user = await User.findOne({
    _id: id,
  });

  // check if user has role
  if (!user.role.includes(roleId)) {
    return res.status(400).send({
      message: "User does not have role",
    });
  }

  user.role.pull(roleId);
  await user.save();

  res.status(200).send({ ok: true, data: { roleId }, roleId, reqId: req.context && req.context.id });
};

// admin-only: grant role to a user
exports.adminGrantRole = async (req, res) => {
  try {
    const { userId, roleName } = req.body || {};
    if (!userId || !roleName) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'userId_and_roleName_required' }, reqId: req.context && req.context.id });

    // validate ObjectId
    const isValidId = require('mongoose').Types.ObjectId.isValid(userId);
    if (!isValidId) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'invalid_user_id' }, reqId: req.context && req.context.id });

    // optional: restrict roleName to known set
    const allowed = ['admin', 'creator', 'reviewer', 'thinker', 'myself', 'user'];
    if (!allowed.includes(roleName)) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'invalid_role' }, reqId: req.context && req.context.id });

    let role = await Role.findOne({ name: roleName });
    if (!role) role = await Role.create({ name: roleName });

    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });

    const has = user.role.some(r => String(r) === String(role._id));
    if (!has) user.role.push(role._id);
    await user.save();

    const populated = await User.findById(userId).populate('role', '-__v');
    const roles = (populated.role || []).map(r => ({ id: r._id, name: 'ROLE_' + r.name.toUpperCase() }));
    return res.status(200).send({ ok: true, data: { userId, roles }, reqId: req.context && req.context.id });
  } catch (e) {
    return res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(e) }, reqId: req.context && req.context.id });
  }
};

// DAO-grant stub: requires shared secret to allow role grant (placeholder for on-chain verification)
exports.daoGrantRole = async (req, res) => {
  try {
    const { userId, roleName, secret } = req.body || {};
    if (!userId || !roleName) return res.status(400).send({ ok: false, error: { code: 'bad_request', message: 'userId_and_roleName_required' }, reqId: req.context && req.context.id });
    if (!process.env.DAO_GRANT_SECRET || secret !== process.env.DAO_GRANT_SECRET) {
      return res.status(403).send({ ok: false, error: { code: 'dao_grant_denied', message: 'invalid_proof' }, reqId: req.context && req.context.id });
    }
    let role = await Role.findOne({ name: roleName });
    if (!role) role = await Role.create({ name: roleName });
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'user_not_found' }, reqId: req.context && req.context.id });
    const has = user.role.some(r => String(r) === String(role._id));
    if (!has) user.role.push(role._id);
    await user.save();
    const populated = await User.findById(userId).populate('role', '-__v');
    const roles = (populated.role || []).map(r => ({ id: r._id, name: 'ROLE_' + r.name.toUpperCase() }));
    return res.status(200).send({ ok: true, data: { userId, roles, via: 'dao' }, reqId: req.context && req.context.id });
  } catch (e) {
    return res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(e) }, reqId: req.context && req.context.id });
  }
};

// admin delete user
exports.deleteUserById = async (req, res) => {
  const id = req.params.id;

  // delete user
  await User.deleteOne({
    _id: id,
  });

  res.status(200).send({
    message: "User deleted",
  });
};

// delete user and all his data
exports.deleteUser = async (req, res) => {
  const id = req.userId;

  // delete user
  await User.deleteOne({
    _id: id,
  });

  res.send({ message: "User was deleted successfully!" });
};

// User forgot password
exports.forgotPassword = async (req, res) => {
  if (!req.body.email) {
    return res.status(400).send({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    // send recovery email
    const emailSent = await sendRecoveryEmail(user, req, res);

    if (!emailSent) {
      return res.status(500).send({ message: "Error sending email" });
    }

    res.status(200).send({
      message: "Recovery email sent",
    });
  } catch (error) {
    res.status(500).send({ message: error });
  }
};

// verify recover password token from email
exports.recover = async (req, res) => {
  if (!req.params.token) {
    return res
      .status(400)
      .json({ message: "We were unable to find a user for this token." });
  }

  try {
    // Find a matching token
    const token = await Token.findOne({ token: req.params.token });

    if (!token) {
      return res
        .status(400)
        .json({ message: "We were unable to find a valid token" });
    }

    // If we found a token, find a matching user
    const user = await User.findOne({ _id: token.userId });

    if (!user) {
      return res
        .status(400)
        .json({ message: "We were unable to find a user for this token." });
    }

    // replace user password by a generated one
    const password = crypto.randomBytes(20).toString("hex");
    user.password = bcrypt.hashSync(password, 8);

    // Save the new password
    await user.save();

    // send email with new password
    const emailSent = await sendNewPassword(user, password, req, res);

    if (!emailSent) {
      return res.status(500).send({ message: "Error sending email" });
    }

    res.redirect(`${CLIENT_URL}user/profile`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verify = async (req, res) => {
  if (!req.params.token) {
    return res
      .status(400)
      .json({ message: "We were unable to find a user for this token." });
  }

  try {
    // Find a matching token
    const token = await Token.findOne({ token: req.params.token });

    if (!token) {
      return res
        .status(400)
        .json({ message: "We were unable to find a valid token" });
    }

    // If we found a token, find a matching user
    User.findOne({ _id: token.userId }, (err, user) => {
      if (!user) {
        return res
          .status(400)
          .json({ message: "We were unable to find a user for this token." });
      }

      if (user.verified) {
        return res
          .status(400)
          .json({ message: "This user has already been verified." });
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
    return res
      .status(400)
      .json({ message: "We were unable to find a user for this token." });
  }

  try {
    const auth = await Auth.findOne({ token: req.params.token });

    if (!auth) {
      return res
        .status(400)
        .json({ message: "We were unable to find a valid token" });
    }

    User.findOne({ _id: auth.userId }, (err, user) => {
      if (!user) {
        return res
          .status(400)
          .json({ message: "We were unable to find a user for this token." });
      }

      const emailToken = crypto.randomBytes(20).toString("hex");

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

        res.cookie("user", JSON.stringify(userObj), { httpOnly: true });
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

    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    if (!user.email || user.email === "") {
      return res.status(400).send({
        message: "User has no email",
      });
    }

    mail.sendVerificationEmail(user, req, res);
    return user.email;
  })
    .then((email) => {
      res.status(200).send({
        message: "Verification email sent to " + email,
      });
    })
    .catch((err) => {
      res.status(500).json({ message: err.message });
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

  sendAuthenticationEmail(user, req, res);
};

exports.helpVisible = async (req, res) => {
  const id = req.sessionId;
  const state = req.body.state;

  const session = await Session.findOne({ sessionId: id });

  if (!session) {
    return res.status(404).send({
      message: "Session not found",
    });
  }

  session.helpOff = !state;
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
      message: "Session not found",
    });
  }

  res.status(200).send({
    helpOff: session.helpOff,
  });
};

exports.getMyThemes = async (req, res) => {
  const userId = req.userId;
  const themes = await Theme.find({ author: userId });

  if (!themes) {
    res.status(404).send({
      message: "Themes not found",
    });
    return;
  }

  const themeData = [];

  for (const theme of themes) {
    themeData.push({
      id: theme._id,
      name: theme.name,
      description: theme.description,
      mode: theme.mode,
      author: theme.author,
      personalize: theme.personalize,
    });
  }

  res.status(200).send({
    themes: themeData,
  });
};

exports.changeModeById = async (req, res) => {
  const userId = req.userId;

  const id = req.params.id;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).send({
      message: "User not found",
    });
    return;
  }

  const theme = await Theme.findById(id);

  if (!theme) {
    res.status(404).send({
      message: "Theme not available",
    });
    return;
  }

  user.theme = theme._id;

  await user.save();

  res.status(200).send({
    theme: user.theme,
    message: "Theme changed",
  });
};

exports.getUserSelectedTheme = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).send({
      message: "User not found",
    });
    return;
  }

  const theme = await Theme.findById(user.theme).populate("palette", "-__v");

  if (!theme) {
    res.status(404).send({
      message: "Theme not found",
    });
    return;
  }

  res.status(200).send({
    theme,
  });
};

// personalize user theme
exports.personalizeMode = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId).populate("theme", "-__v");

  if (!user) {
    res.status(404).send({
      message: "User not found",
    });
    return;
  }

  const public = req.body.public;

  const id = req.params.id;

  const theme = await Theme.findById(id).populate("palette", "-__v");

  if (!theme.personalize) {
    res.status(404).send({
      message: "Theme not personalizable",
    });
    return;
  }

  const selectedPalette = req.body.palette;

  const newPalette = {
    $inkwell: selectedPalette.inkwell,
    $darknight: selectedPalette.darknight,
    $darkblue: selectedPalette.darkblue,
    $darkpurple: selectedPalette.darkpurple,
    $deepblue: selectedPalette.deepblue,
    $blue: selectedPalette.blue,
    $lightgreen: selectedPalette.lightgreen,
    $paleturquoise: selectedPalette.paleturquoise,
    $fluogreen: selectedPalette.fluogreen,
    $palegreen: selectedPalette.palegreen,
    $yellowish: selectedPalette.yellowish,
    $indigo: selectedPalette.indigo,
    $greyblue: selectedPalette.greyblue,
    $bluesky: selectedPalette.bluesky,
    $salmon: selectedPalette.salmon,
    $redpink: selectedPalette.redpink,
    $whitebeach: selectedPalette.whitebeach,
    $palewhitebeach: selectedPalette.palewhitebeach,
    $darkwhitebeach: selectedPalette.darkwhitebeach,
    $bitcoin: selectedPalette.bitcoin,
    $lightolive: selectedPalette.lightolive,
    $olive: selectedPalette.olive,
  };

  const paletteIds = [];

  // for each colors generate a new palette
  for (const key in newPalette) {
    const color = newPalette[key];

    const newColor = new Palette({
      name: key,
      hex: color,
    });

    await newColor.save();

    paletteIds.push(newColor._id);
  }

  await theme.save();

  const newTheme = new Theme({
    name: req.body.name,
    description: req.body.description,
    mode: theme.mode,
    author: userId,
    personalize: true,
    public: public,
    palette: paletteIds,
  });

  await newTheme.save();

  user.theme = newTheme._id;

  await user.save();

  res.status(200).send({
    theme: user.theme,
    message: "Theme personalized",
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
