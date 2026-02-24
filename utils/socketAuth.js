const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

function socketAuthMiddleware(socket, next) {
  try {
    const hdr = socket.handshake.headers || {};
    const auth = socket.handshake.auth || {};
    const token = auth.token || hdr['x-access-token'] || hdr['authorization']?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('unauthorized: missing token'));
    const decoded = jwt.verify(token, authConfig.secret);
    socket.user = { id: decoded.id };
    return next();
  } catch (e) {
    return next(new Error('unauthorized: invalid token'));
  }
}

module.exports = { socketAuthMiddleware };

