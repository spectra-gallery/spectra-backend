// controllers/initController.js
require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { initKeyPair, getRegistrationOptions, verifyRegistration, getAuthenticationOptions, verifyAuthentication, signDataWithPrivateKey, getPublicKeyPem } = require("../services/client.yubikey.service");
const { sendSetupEmail } = require("../services/mailSetupService");

const axiosInstance = require("../services/axiosInstance");


const clientConfig = require("../config/client.config");

// An in-memory object for demonstration to keep track of tokens
const pendingTokens = {};

/**
 * Controller to initialize RSA key pair on demand, send token link via email.
 * This is typically called by an Express route. For example, GET /init
 */
async function initController(req, res) {
  try {
    // 1) Initialize the keys
    await initKeyPair();
    console.log("RSA key pair ready.");

    // 2) Generate a random token
    const token = crypto.randomBytes(16).toString("hex");
    const adminEmail = clientConfig.ADMIN_EMAIL || "admin@example.com";

    // 3) Store token in our in-memory data
    pendingTokens[token] = {
      email: adminEmail,
      used: false,
    };

    // 4) Build the setup link
    const setupUrl = `${clientConfig.BASE_URL}client/auth/setup?token=${token}`;

    // 5) Send the email with the setup link
    await sendSetupEmail(adminEmail, setupUrl);
    console.log(`Setup email sent to ${adminEmail}`);

    // 6) Respond to the caller
    return res.status(200).json({
      success: true,
      message: "Key pair initialized and setup email sent",
      token: token,
    });
  } catch (err) {
    console.error("Error initializing key pair:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function setupAuth (req, res) {
  
  // send the html page in /ressources/html/setup.html public folder and serve it to the user
  res.sendFile(path.join(__basedir, '/ressources/html/client/setup.html'));

}

async function markTokenUsed (req, res) {
  const { token } = req.query;
  if (token && pendingTokens[token]) {
    pendingTokens[token].used = true;
  }
  res.json({ success: true });
}

async function registrationOptions (req, res) {
  try {
    const options = await getRegistrationOptions();
    return res.json(options);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
  
}

async function verifyRegistration (req, res) {
  try {
    const result = await verifyRegistration(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

async function authenticationOptions (req, res) {
  try {
    const options = await getAuthenticationOptions();
    res.json(options);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function verifyAuthentication (req, res) {
  try {
    const result = await verifyAuthentication(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function signAndSend (req, res) {
  try {
    const data = JSON.stringify({ message: "Hello from Server A" });
    const signature = signDataWithPrivateKey(data);

    /*
    const serverBUrl = appCypherConfig.BACKEND_API_URL +  "/api/auth/verify-signature";
    const response = await fetch(serverBUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, signature }),
    });
    const result = await response.json();
    */

    
    const result = await axiosInstance.post("/client/auth/verify-signature", { data, signature });


    // Return the result from Server B
    res.json({ success: true, serverBResponse: result });
  } catch (err) {
    console.error("Error in sign-and-send:", err);
    res.status(500).json({ error: err.message });
  }
}


async function getPublicKey (req, res) {
  try {
    const publicKeyPem = await getPublicKeyPem();
    res.send(publicKeyPem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function verifySignature (req, res) {
  const { data, signature } = req.body;
  const publicKeyPem = await getPublicKeyPem();
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(data);
  const isValid = verifier.verify(publicKeyPem, signature, "base64");
  res.json({ isValid });
}


// Export the controller and the in-memory store so we can use it in routes
module.exports = {
  initController,
  setupAuth,
  markTokenUsed,
  registrationOptions,
  verifyRegistration,
  authenticationOptions,
  verifyAuthentication,
  signAndSend,
  getPublicKey,
  verifySignature,
  pendingTokens,
};
