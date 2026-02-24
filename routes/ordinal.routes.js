const { authJwt } = require('../middlewares')
const controller = require('../controllers/ordinal.controller')

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept')
    next()
  })

  app.post('/api/ordinal/recursion/config', [authJwt.verifySession], controller.saveRecursionConfig)
  app.post('/api/ordinal/inscribe', [authJwt.verifySession], controller.createInscription)
}

