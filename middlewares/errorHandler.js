module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const payload = {
    ok: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code,
    },
    reqId: (req && req.context && req.context.id) || undefined,
  };
  try {
    const log = {
      level: 'error',
      ts: new Date().toISOString(),
      reqId: payload.reqId,
      status,
      message: err.message,
      stack: err.stack,
      path: req && (req.originalUrl || req.url),
      method: req && req.method,
    };
    console.error(JSON.stringify(log));
  } catch (_) {}
  if (!res.headersSent) {
    res.status(status).json(payload);
  } else {
    next(err);
  }
}

