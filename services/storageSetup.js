const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const axiosInstance = require("../services/axiosInstance");

const config = require("../config/auth.config");
const appCypherConfig = require("../config/app.cypher.config");
const API_SESSION_SECRET = appCypherConfig.API_SESSION_SECRET;
let storageToken = null;

// Retry/backoff controls
const MAX_RETRIES = parseInt(process.env.STORAGE_PROBE_MAX_RETRIES || "5", 10);
const BACKOFF_MS = parseInt(process.env.STORAGE_PROBE_BACKOFF_MS || "500", 10);
const NON_FATAL = String(process.env.STORAGE_PROBE_NON_FATAL || "true").toLowerCase() === "true";
const VERBOSE_PROBE_LOG = String(process.env.STORAGE_PROBE_VERBOSE || "false").toLowerCase() === "true";

const STORAGE_DOMAIN = process.env.STORAGE_DOMAIN || 'storage.spectra.gallery';

async function getWithRetry(path, config = {}) {
  let attempt = 0;
  let lastErr = null;
  while (attempt <= MAX_RETRIES) {
    try {
      const res = await axiosInstance.request({ url: path, method: "GET", ...config });
      return res;
    } catch (e) {
      lastErr = e;
      if (VERBOSE_PROBE_LOG) {
        console.warn(`[storageStatus] attempt ${attempt + 1} failed: ${e?.message || e}`);
      }
      const delay = BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
  // Final fallback: try direct storage domain to bypass reverse proxy issues
  try {
    const directUrl = `https://${STORAGE_DOMAIN.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await axios.request({ url: directUrl, method: 'GET', timeout: 7000, headers: { 'Accept': 'application/json' } });
    return res;
  } catch (e) {
    lastErr = e;
  }
  if (!NON_FATAL) throw lastErr;
  return null;
}

const storageStatus = async () => {
  try {
    const response = await getWithRetry("/app/storage/status");
    if (!response || !response.data) return null;

    const { initialized, registered, authenticated, publickey, api } = response.data;

    return { initialized, registered, authenticated, publickey, api };
  } catch (err) {
    // keep concise log
    console.warn(`[storageStatus] probe error: ${err?.message || err}`);
    return null;
  }
};

const setupStorage = async () => {
  try {
    const response = await axiosInstance.get("/app/auth/init");

    const { success, token, setupUrl } = response.data;

    if (success) {
      storageToken = token;
      // Present a localhost URL for human use in dev logs/UI
      const base = (process.env.STORAGE_PUBLIC_URL || appCypherConfig.STORAGE_PUBLIC_URL || 'http://localhost:6601').replace(/\/+$/,'');
      return `${base}/app/auth/init/setup?token=${token}`;
    }

    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getPublicKey = async () => {
  try {
    const response = await axiosInstance.get(
      "/app/auth/fido2/active/public-key?token=" + storageToken
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const _triggerStorageVerification = async () => {
  try {
    const response = await axiosInstance.post(
      "/app/auth/sign-and-send?token=" + storageToken
    );
    console.log("triggerStorageVerification response1", response);
    console.log("triggerStorageVerification response2", response.data);
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const triggerStorageVerification = async () => {
  try {
    // set headers

    const response = await axiosInstance.post(
      "/app/auth/sign-and-send?token=" + storageToken
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const authenticateApi = async (token) => {
  try {
    axiosInstance.defaults.headers.common["5p3-config-token"] = token;
    const response = await axiosInstance.post(
      "/app/auth/api/config?token=" + storageToken
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const sendEncyptedData = async (slug, signature, data) => {
  // sign the data with the private key
  try {
    const token = jwt.sign({ slug, signature }, API_SESSION_SECRET, {
      expiresIn: "1h",
    });

    // set the token in the header using interceptor
    axiosInstance.defaults.headers.common["spectra-api-session-token"] = token;

    const response = await axiosInstance.post("/storage/upload/api/data", {
      data,
    });

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getStorageToken = () => {
  return storageToken;
};

const verifyApiSignature = async (data, signature, token) => {
    try {
      axiosInstance.defaults.headers.common["5p3-config-token"] = token;
      const response = await axiosInstance.post("/app/storage/verify-signature", {
        data,
        signature,
      });
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
};

module.exports = {
  setupStorage,
  storageStatus,
  getPublicKey,
  getStorageToken,
  triggerStorageVerification,
  authenticateApi,
  sendEncyptedData,
  verifyApiSignature
};
