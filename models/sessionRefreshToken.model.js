const mongoose = require('mongoose');
const config = require('../config/session.config');
const {v4: uuidv4} = require('uuid');
const crypto = require('crypto');

const SessionRefreshTokenSchema = new mongoose.Schema({
  token: String,
  sessionId: String,
  expiryDate: Date,
});

SessionRefreshTokenSchema.statics.createToken = async function(session) {
  const expiredAt = new Date();

  expiredAt.setSeconds(
      expiredAt.getSeconds() + config.jwtRefreshExpiration,
  );

  const _token = uuidv4();
  // const sessionId = crypto.randomBytes(16).toString("base64");

  const _object = new this({
    token: _token,
    sessionId: session.sessionId,
    // store as Date for consistent casting
    expiryDate: expiredAt,
  });

  // console.log(_object);

  const sessionRefreshToken = await _object.save();

  return sessionRefreshToken.token;
};

SessionRefreshTokenSchema.statics.verifyExpiration = (token) => {
  return token.expiryDate.getTime() < new Date().getTime();
};

const SessionRefreshToken = mongoose.model('SessionRefreshToken', SessionRefreshTokenSchema);

module.exports = SessionRefreshToken;
