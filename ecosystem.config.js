module.exports = {
  apps: [{
    name: 'function-api',
    exec_mode: 'cluster',
    instances: 0,
    script: './server.js',
    watch: '.',
  }],
};
