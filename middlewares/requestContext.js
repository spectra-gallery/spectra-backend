const { randomUUID } = require('crypto');

module.exports = function requestContext(req, res, next) {
  const start = Date.now();
  const reqId = req.headers['x-request-id'] || randomUUID();
  req.context = { id: reqId, start };
  res.setHeader('x-request-id', reqId);

  res.on('finish', () => {
    const ms = Date.now() - start;
    const log = {
      ts: new Date().toISOString(),
      reqId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms,
      ip: req.ip,
    };
    try { console.log(JSON.stringify({ level: 'info', ...log })); } catch (_) {}
  });

  next();
};

