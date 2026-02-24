const adminToken = require('../middlewares/adminToken');
const { monitor } = require('../controllers/monitor.controller');
const { adminPm2Restart } = require('../controllers/admin.controller');

module.exports = function(app) {
  app.get('/api/monitor', monitor);
  app.post('/api/admin/pm2/restart', adminToken, adminPm2Restart);
};

