const { getAppStatus, setupAuth, markTokenUsed, registrationOptions, _verifyRegistration, authenticationSetup, authenticationOptions, _verifyAuthentication, getPublicKey, _configureStorage, signAndSend, storageValidation, _apiAuthConfig, getStorageConfigStatus, getEncryptedData } = require("../controllers/app.auth.controller");
const { authInit, authAPI } = require("../middlewares");

const session = require("express-session");
const MongoStore = require("connect-mongo");
const { v4: uuidv4 } = require("uuid");

const appCypherConfig = require("../config/app.cypher.config");
const dbConfig = require('../config/db.config');

const SESSION_SECRET = appCypherConfig.SESSION_SECRET;

const MONGO_URI = `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

module.exports = function (app) {
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

  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept",
      "session-token, Origin, Content-Type, Accept",
      "spectra-api-session-token, Origin, Content-Type, Accept"
    );
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
};