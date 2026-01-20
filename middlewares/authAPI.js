const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const appCypherConfig = require("../config/app.cypher.config.js");
const STORAGE_SESSION_SECRET = appCypherConfig.STORAGE_SESSION_SECRET;

const crypto = require("crypto");

const {
  getStoragePublicKey,
} = require("../controllers/app.storage.controller");

let cachedPublicKeyPem = null;

const getPublicKey = async () => {
  if (cachedPublicKeyPem) {
    return cachedPublicKeyPem;
  }
  try {
    const { publicKey } = await getStoragePublicKey();
    cachedPublicKeyPem = publicKey;
    return publicKey;
  } catch (err) {
    console.error("Error in get-public-key-from-server:", err);
    return null;
  }
};

verifySignature = async (req, res, next) => {
  const token = req.headers["spectra-api-session-token"];

  if (!token) {
    return res.status(403).send({ message: "No access token provided!" });
  }

  const publicKeyPem = await getPublicKey();

  jwt.verify(token, STORAGE_SESSION_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access token!" });
    }

    const { slug, signature } = decoded;

    if (!slug || !signature) {
      return res.status(400).send({ message: "Missing slug or signature!" });
    }
    const data = req.body.data;
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(data);
    verifier.end();

    const isValid = verifier.verify(publicKeyPem, signature, "base64");

    if (isValid) {
      req.slug = slug;
      next();
    } else {
      return res.status(401).send({ message: "[authAPI] Invalid signature!" });
    }
  });
};

const authAPI = {
  verifySignature,
};
module.exports = authAPI;
