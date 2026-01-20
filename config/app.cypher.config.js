// dotenv config with APP_ENV-aware file selection (single source of truth)
(() => {
  const path = require('path');
  const fs = require('fs');
  const dotenv = require('dotenv');
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const map = { development: '.env.dev', dev: '.env.dev', staging: '.env.staging', production: '.env', prod: '.env' };
  let filename = map[env] || (env ? `.env.${env}` : '.env');
  // Prefer .env.prod if running prod and file exists
  if ((env === 'production' || env === 'prod') && fs.existsSync(path.join(__dirname, '..', '.env.prod'))) {
    filename = '.env.prod';
  }
  const envPath = path.join(__dirname, '..', filename);
  // Load specific file first, then base .env without overriding existing vars
  dotenv.config({ path: envPath });
  dotenv.config();
  process.env.__ENV_FILE = filename;
})();

module.exports = {
  API_ID: process.env.API_ID || 'spectra-backend',
  API_NAME: process.env.API_NAME || 'spectra-gallery-api',
  API_DISPLAY_NAME: process.env.API_DISPLAY_NAME || 'Spectra Gallery API',
  PORT: parseInt(process.env.PORT || 8000, 10),
  CLIENT_URL: process.env.CLIENT_URL || 'https://spectra.gallery/',
  BASE_URL: process.env.BASE_URL || 'https://api.spectra.gallery/',
  // Public URL used in links shown to users
  STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL || process.env.STORAGE_API_URL || 'https://storage.spectra.gallery',
  // Internal URL used for service-to-service calls (prefer loopback to avoid proxy timing)
  STORAGE_INTERNAL_URL: process.env.STORAGE_INTERNAL_URL || process.env.STORAGE_API_URL || 'http://127.0.0.1:6601',
  RP_ID: process.env.RP_ID || 'spectra.gallery',
  WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN || 'https://api.spectra.gallery',
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-me-in-prod',
  MAIL_HOST: process.env.MAIL_HOST || 'mail.infomaniak.com',
  MAIL_PORT: Number(process.env.MAIL_PORT || 465),
  SPECTRA_EMAIL: process.env.SPECTRA_EMAIL || 'artist@spectra.gallery',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
  STORAGE_SESSION_SECRET: process.env.STORAGE_SESSION_SECRET || 'change-me-in-prod',
  API_SESSION_SECRET: process.env.API_SESSION_SECRET || 'change-me-in-prod',
  ADMIN_RESTART_TOKEN: process.env.ADMIN_RESTART_TOKEN || ''
};
