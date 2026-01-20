const { exec } = require('child_process');

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function pm2Restart(name) {
  const check = await run(`pm2 pid ${name}`);
  if (check.error) {
    return { ok: false, message: `pm2 not managing ${name} or pm2 not available` };
  }
  const res = await run(`pm2 restart ${name}`);
  if (res.error) {
    return { ok: false, message: res.stderr || String(res.error) };
  }
  return { ok: true, message: res.stdout.trim() };
}

async function adminPm2Restart(req, res) {
  const { service } = req.body || {};
  if (!service) return res.status(400).json({ ok: false, error: 'Missing service' });

  if (service === 'backend') {
    const r = await pm2Restart('spectra-backend');
    if (!r.ok) return res.status(500).json(r);
    return res.json(r);
  }
  if (service === 'storage') {
    const r = await pm2Restart('spectra-storage');
    if (!r.ok) return res.status(500).json(r);
    return res.json(r);
  }
  return res.status(400).json({ ok: false, error: 'Unknown service' });
}

module.exports = { adminPm2Restart };

