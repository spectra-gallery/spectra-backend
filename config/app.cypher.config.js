// dotenv config with APP_ENV-aware file selection
(() => {
  const path = require('path');
  const dotenv = require('dotenv');
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const map = { development: '.env.dev', dev: '.env.dev', staging: '.env.staging', production: '.env', prod: '.env' };
  const filename = map[env] || (env ? `.env.${env}` : '.env');
  const envPath = path.join(__dirname, '..', filename);
  dotenv.config({ path: envPath });
  dotenv.config();
})();

module.exports = {
  API_ID: process.env.API_ID || 'spectra-backend',
  API_NAME: process.env.API_NAME || 'spectra-gallery-api',
  API_DISPLAY_NAME: process.env.API_DISPLAY_NAME || 'Spectra Gallery API',
  PORT: parseInt(process.env.PORT || 8000, 10),
  CLIENT_URL: process.env.CLIENT_URL || 'https://spectra.gallery/',
  BASE_URL: process.env.BASE_URL || 'https://api.spectra.gallery/',
  STORAGE_API_URL: process.env.STORAGE_API_URL || 'https://storage.spectra.gallery',
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
