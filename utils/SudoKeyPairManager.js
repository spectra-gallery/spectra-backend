const crypto = require("crypto");

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
  return { publicKey, privateKey };
}

// encrypt the private key using the public et session secret
function encryptPrivateKey(publicKey, privateKey) {
  
  return encrypted.toString("base64");
}

// decrypt the private key
function decryptPrivateKey(encryptedPrivateKey, sessionSecret) {
  const buffer = Buffer.from(encryptedPrivateKey, "base64");
  const decrypted = crypto.publicDecrypt(sessionSecret, buffer);
  return decrypted.toString("utf8");
}

// Use this in server startup
const keys = generateKeyPair();

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
  keys,
  generateKeyPair,
};
