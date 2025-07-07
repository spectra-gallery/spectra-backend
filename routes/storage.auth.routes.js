/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const controller = require('../controllers/app.auth.controller');

const session = require("express-session");
const MongoStore = require("connect-mongo");
const { v4: uuidv4 } = require("uuid");

const appCypherConfig = require("../config/app.cypher.config");
const dbConfig = require('../config/db.config');

const SESSION_SECRET = appCypherConfig.SESSION_SECRET;

const MONGO_URI = `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

module.exports = function(app) {
  app.use(
        session({
          secret: SESSION_SECRET || "keyboard cat",
          resave: false,
          saveUninitialized: false,
          store: MongoStore.create({ mongoUrl: MONGO_URI }),
          cookie: {
            httpOnly: true,
            secure: false, // set to true if you run HTTPS in production
            maxAge: 1000 * 60 * 60, // 1 hour
          },
        })
      );

  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        
        'x-access-token, Origin, Content-Type, Accept',
        'x-refresh-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
        'session-refresh, Origin, Content-Type, Accept'
        
    );
    next();
  });
  /*
  app.use('/api/auth', (req, res, next) => {
    req.target = 'auth';
    next();
  });
  */


  app.post("/app/storage/verify-signature", controller._verifyStorageSignature);

  // app.post("/app/storage/request-token", controller.signin);

};
