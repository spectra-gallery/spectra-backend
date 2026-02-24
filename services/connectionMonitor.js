const axios = require("axios");
const appCypherConfig = require("../config/app.cypher.config");
const axiosInstance = require("./axiosInstance");
const mail = require("../middlewares/mail");
const {
  storageStatus,
} = require("./storageSetup");

// Lightweight in-process monitor for storage/frontend links and handshake
class ConnectionMonitor {
  constructor(opts = {}) {
    this.intervalMs = opts.intervalMs || 30000; // 30s default
    this.maxBackoffMs = opts.maxBackoffMs || 10 * 60 * 1000; // 10 min
    this.currentInterval = this.intervalMs;
    this.timer = null;
    this.running = false;
    this.lastIncidentAt = null;
    this.adminEmail = appCypherConfig.ADMIN_EMAIL;
    this.frontendUrl = appCypherConfig.CLIENT_URL?.replace(/\/$/, "");
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await this._tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.running = false;
  }

  async _tick() {
    if (!this.running) return;
    try {
      const ok = await this._probeAll();
      // reset backoff on success
      if (ok) this.currentInterval = this.intervalMs;
    } catch (_e) {
      // swallow; backoff is handled in _probeAll
    } finally {
      this.timer = setTimeout(() => this._tick(), this.currentInterval);
    }
  }

  async _probeAll() {
    const results = await Promise.allSettled([
      this._probeStorage(),
      this._probeFrontend(),
    ]);

    const ok = results.every((r) => r.status === "fulfilled" && r.value === true);
    if (!ok) {
      // exponential backoff when issues persist
      this.currentInterval = Math.min(this.currentInterval * 2, this.maxBackoffMs);
    }
    return ok;
  }

  async _probeFrontend() {
    if (!this.frontendUrl) return true; // nothing to probe
    try {
      // A lightweight GET on frontend root; Nuxt will respond 200 in dev/prod
      await axios.get(`${this.frontendUrl}`);
      return true;
    } catch (err) {
      await this._reportIncident("frontend_down", err?.message || String(err));
      return false;
    }
  }

  async _probeStorage() {
    try {
      const status = await storageStatus();
      if (!status) throw new Error("storageStatus null");
      const { initialized, registered, authenticated, publickey, api } = status;

      // If any link in the chain is down, try to self-heal progressively
      if (!initialized || !registered || !authenticated || !publickey || !api) {
        await this._reportIncident("storage_not_ready", JSON.stringify(status));
        return false;
      }

      return true;
    } catch (err) {
      await this._reportIncident("storage_unreachable", err?.message || String(err));
      return false;
    }
  }

  async _attempt(kind, fn) {
    try {
      await fn();
    } catch (e) {
      await this._reportIncident(kind, e?.message || String(e));
    }
  }

  async _reportIncident(kind, detail) {
    const now = Date.now();
    // de-duplicate noisy bursts (send at most one per 5 min per kind)
    if (this.lastIncidentAt && now - this.lastIncidentAt < 5 * 60 * 1000) return;
    this.lastIncidentAt = now;

    const to = this.adminEmail;
    if (!to) return;

    const restartApiUrl = `${appCypherConfig.BASE_URL}app/admin/restart/backend`;
    const restartStorageUrl = `${appCypherConfig.BASE_URL}app/admin/restart/storage`;
    const rehandshakeUrl = `${appCypherConfig.BASE_URL}app/admin/rehandshake/storage`;
    const storageStatusUrl = `${appCypherConfig.BASE_URL}app/auth/storage/status`;

    const html = `
      <h3>Spectra Connection Incident: ${kind}</h3>
      <p>Detail: ${detail}</p>
      <ul>
        <li><a href="${rehandshakeUrl}">Re-run handshake</a></li>
        <li><a href="${storageStatusUrl}">Open storage setup status</a></li>
        <li><a href="${restartStorageUrl}">Restart storage (if supervised)</a></li>
        <li><a href="${restartApiUrl}">Restart backend (if supervised)</a></li>
      </ul>
    `;

    await mail.sendMail({
      from: appCypherConfig.SPECTRA_EMAIL,
      to,
      subject: `[Spectra] Connection incident: ${kind}`,
      html,
    });
  }
}

module.exports = { ConnectionMonitor };
