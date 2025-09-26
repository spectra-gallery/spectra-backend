function ts () {
  return new Date().toISOString()
}

function out (level, msg, meta) {
  try {
    const payload = { level, ts: ts(), msg }
    if (meta && typeof meta === 'object') Object.assign(payload, meta)
    const line = JSON.stringify(payload)
    if (level === 'error') console.error(line)
    else console.log(line)
  } catch (_) {
    // fallback
    if (level === 'error') console.error(msg)
    else console.log(msg)
  }
}

module.exports = {
  info: (msg, meta) => out('info', msg, meta),
  warn: (msg, meta) => out('warn', msg, meta),
  error: (msg, meta) => out('error', msg, meta)
}

