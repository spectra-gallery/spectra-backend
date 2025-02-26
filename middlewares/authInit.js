

const { getPendingTokens } = require("../controllers/app.auth.controller");


verifyToken = (req, res, next) => {
  const token = req.token;

    const tokenObj = getPendingTokens(token);

    if (!token) { 
      return res.status(400).json({ success: false, error: "Missing token" });
    }
  
    if (!tokenObj) {
      return res.status(400).json({ success: false, error: "Invalid token" });
    }

    if (tokenObj.used) {
        return res.status(400).json({ success: false, error: "Token already used" });
    }

    if (token !== tokenObj.token) {
        return res.status(400).json({ success: false, error: "Invalid token" });
    }

    next();
};


const authInit = {
  verifyToken
};
module.exports = authInit;
