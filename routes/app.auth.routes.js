const { getAppStatus, setupAuth, markTokenUsed, registrationOptions, _verifyRegistration, authenticationSetup, authenticationOptions, _verifyAuthentication, getPublicKey, _configureStorage, signAndSend, storageValidation, _apiAuthConfig, getStorageConfigStatus, getEncryptedData, adminRestart, adminRehandshake } = require("../controllers/app.auth.controller");
// Import only what we need to avoid pulling all middlewares (which may require DB)
const authInit = require("../middlewares/authInit");
const authAPI = require("../middlewares/authAPI");

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

module.exports = function (app) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || `${appCypherConfig.CLIENT_URL},https://spectra.gallery,https://api.spectra.gallery`).split(',').map(s => s.trim()).filter(Boolean);
  const cookieSecure = (process.env.COOKIE_SECURE === '1') || (process.env.NODE_ENV === 'production');
  const useMemory = process.env.SKIP_DB === '1' || !hasDbCreds;
  const store = useMemory ? new session.MemoryStore() : MongoStore.create({ mongoUrl: MONGO_URI });
  app.use(
    session({
      secret: SESSION_SECRET || 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSecure ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60,
      },
    })
  );

  app.use(function (req, res, next) {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      // Non-browser or same-origin
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'x-access-token, session-token, spectra-api-session-token, Origin, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use('/app/auth', (req, res, next) => {
    const { token } = req.query;
    req.token = token;
    next();
  });

  app.get("/app/auth/status", getAppStatus);

    // init route
  app.get("/app/auth/setup", [authInit.verifyToken], setupAuth);

  app.get("/app/auth/mark-token-used", [authInit.verifyToken], markTokenUsed);

  app.get("/app/auth/fido2/register/options", [authInit.verifyToken], registrationOptions);
    
  app.post("/app/auth/fido2/register/verify", [authInit.verifyToken], _verifyRegistration);

  app.get("/app/auth/fido2/auth/setup", [authInit.verifyToken], authenticationSetup);
    
  app.get("/app/auth/fido2/auth/options", [authInit.verifyToken], authenticationOptions);
  
  app.post("/app/auth/fido2/auth/verify", [authInit.verifyToken], _verifyAuthentication);

  app.get("/app/auth/storage/config", [authInit.verifyToken], _configureStorage);

  app.get("/app/auth/storage/validate", [authInit.verifyToken], storageValidation);
   
  app.get("/app/auth/api/auth", [authInit.verifyToken], _apiAuthConfig);
    
  app.get("/app/auth/fido2/active/public-key", [authInit.verifyToken], getPublicKey);

  app.get("/app/auth/storage/status", [authInit.verifyToken], getStorageConfigStatus);
    
  // signAndSend route
  app.post("/app/auth/sign-and-send", [authInit.verifyToken], signAndSend);

  app.post('/app/auth/api/upload/data', [authAPI.verifySignature], /*upload.single('file'),*/ getEncryptedData);

  // Admin controls for recovery (protected by token)
  const adminToken = require('../middlewares/adminToken');
  app.get('/app/admin/restart/:service', adminToken, adminRestart);
  app.get('/app/admin/rehandshake/:peer', adminToken, adminRehandshake);
};
