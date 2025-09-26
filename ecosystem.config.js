module.exports = {
  apps: [
    {
      name: 'spectra-backend',
      script: './server.js',
      exec_mode: 'cluster',
      instances: 0,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

