
function extractClientIP(req, res, next) {
    
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      req.clientIP = xForwardedFor.split(',')[0].trim();
    }

    req.clientIP = (
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown'
        );
    next();
}

module.exports = {
    extractClientIP
};