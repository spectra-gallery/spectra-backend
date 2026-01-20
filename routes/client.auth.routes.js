const { initController, setupAuth, markTokenUsed, registrationOptions, authenticationOptions, verifyAuthentication, getPublicKey } = require("../controllers/client.auth.controller");
const { authJwt } = require("../middlewares");


module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/client/init", [authJwt.verifyToken], initController);

  app.get("/client/auth/setup", [authJwt.verifyToken], setupAuth);

  app.get("/client/auth/mark-token-used", [authJwt.verifyToken], markTokenUsed);

  app.get("/client/auth/fido2/register/options", [authJwt.verifyToken], registrationOptions);
    
  app.post("/client/auth/fido2/register/verify", [authJwt.verifyToken], verifyRegistration);
    
  app.get("/client/auth/fido2/auth/options", [authJwt.verifyToken], authenticationOptions);
  
  app.post("/client/auth/fido2/auth/verify", [authJwt.verifyToken], verifyAuthentication);
   
  app.get("/client/auth/public-key", [authJwt.verifyToken], getPublicKey);
    
  
};