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

const hasDbCreds = Boolean(dbConfig.DB_USER && dbConfig.DB_PASSWORD);
const MONGO_URI = hasDbCreds
  ? `mongodb://${dbConfig.DB_USER}:${encodeURIComponent(dbConfig.DB_PASSWORD)}@${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}?authSource=${dbConfig.AUTH_SOURCE}`
  : `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

module.exports = function(app) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || `${appCypherConfig.CLIENT_URL},https://spectra.gallery,https://api.spectra.gallery`).split(',').map(s => s.trim()).filter(Boolean);
  const cookieSecure = (process.env.COOKIE_SECURE === '1') || (process.env.NODE_ENV === 'production');
  const useMemory = process.env.SKIP_DB === '1' || !hasDbCreds;
  const store = useMemory ? new session.MemoryStore() : MongoStore.create({ mongoUrl: MONGO_URI });
  app.use(
    session({
      secret: SESSION_SECRET || "keyboard cat",
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSecure ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60, // 1 hour
      },
    })
  );

  app.use(function(req, res, next) {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'x-access-token, x-refresh-token, session-token, session-refresh, Origin, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
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
