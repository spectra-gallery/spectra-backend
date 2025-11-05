module.exports = {
  apps: [
    {
      name: 'spectra-backend',
      script: 'npm',
      args: 'run start:prod',
      env: Object.assign(
        { APP_ENV: 'production', NODE_ENV: 'production', SPECTRA_STORAGE_BASES: 'http://127.0.0.1:6601,https://storage.spectra.gallery' },
        (require('fs').existsSync('.env.prod') ? require('dotenv').config({ path: '.env.prod' }).parsed : {})
      ),
      instances: 1,
      exec_mode: 'fork',
      watch: false
    }
  ]
};
