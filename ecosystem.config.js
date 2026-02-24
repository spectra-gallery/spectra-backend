module.exports = {
  apps: [
    {
      name: 'spectra-backend',
      script: 'npm',
      args: 'run start:prod',
      exec_mode: 'cluster',
      instances: 0,
      watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
      CLIENT_URL: 'https://spectra.gallery',
      BASE_URL: 'https://api.spectra.gallery/',
      STORAGE_API_URL: 'https://storage.spectra.gallery',
      RP_ID: 'spectra.gallery',
      WEBAUTHN_ORIGIN: 'https://api.spectra.gallery',
      DISABLE_AUTO_SETUP: '1',
      // Set these securely (prefer system env or an .env file not committed)
        // DB_HOST: '127.0.0.1',
        // DB_PORT: '27017',
        // DB_NAME: 'spectra',
        // DB_USER: 'spectra_user',
        // DB_PASSWORD: 'REDACTED',
        // DB_AUTH_SOURCE: 'spectra',
        // JWT_SECRET: 'REDACTED',
        // SESSION_SECRET: 'REDACTED',
        // ADMIN_RESTART_TOKEN: 'REDACTED',
      },
      env_staging: {
        APP_ENV: 'staging',
        NODE_ENV: 'production'
      },
      env_development: {
        APP_ENV: 'dev',
        NODE_ENV: 'development'
      }
    }
  ]
};
