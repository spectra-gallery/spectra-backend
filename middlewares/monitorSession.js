
function extractClientIP(req, res, next) {
  // Prefer first hop from X-Forwarded-For when behind a proxy; else fall back
  const xForwardedFor = req.headers['x-forwarded-for']
  if (xForwardedFor && typeof xForwardedFor === 'string' && xForwardedFor.length) {
    req.clientIP = xForwardedFor.split(',')[0].trim()
  }

  if (!req.clientIP) {
    req.clientIP = (
      req.ip ||
      (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      'unknown'
    )
  }
  next()
}

module.exports = {
    extractClientIP
};
