const session = require("express-session");

const { sudoCypher } = require("../middlewares");
const { authJwt } = require("../middlewares");

const db = require("../models");
require("dotenv").config();
const MongoStore = require("connect-mongo");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { generateKeyPairSync } = require("crypto");
const path = require("path");

const appCypherConfig = require("../config/app.cypher.config");
const dbConfig = require("../config/db.config");
const sudoSession = require("../config/sudo_session.config");

const { globalInclude } = require("../helpers/db.helpers");

const controller = require('../controllers/auth.controller');

const { encodeString, decodeString, encryptString, decryptString } = require("../helpers/cypher.helpers");


const {
  buildPublicDirectory,
  buildDirectory,
  ensureDirectoryExists,
} = require("../helpers/path.helpers");


const SESSION_SECRET = sudoSession.SESSION_SECRET;

const MONGO_URI = `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;


// FIDO2 Library
const { Fido2Lib } = require("fido2-lib");


const Role = db.role;
const Credential = db.credential;
const User = db.user;
const Sudo = db.sudo;
const Challenge = db.challenge;
const Cypher = db.cypher;

const fido2 = new Fido2Lib({
  timeout: 60000,
  rpId: appCypherConfig.RP_ID, // In production, use your actual domain (without https://)
  rpName: "2FA - YubiKey",
  challengeSize: 32,
  attestation: "direct", // or 'none'
  cryptoParams: [-7, -257], // ES256, RS256
});

const checkUserChallenge = async (userId) => {
  // check if user has unused challenge
  const user = await User.findById(userId).populate("challenges");
  const userChallenges = user.challenges;
  if (!userChallenges) return null;
  // check if user has unused challenge and if issued date is bigger than 5 minutes
  const now = new Date();
  const fiveMinutesAgo = new Date(now - 5 * 60000).toISOString();
  const challenge = userChallenges.find(
    (challenge) =>
      challenge.used === false &&
      new Date(challenge.issued) < new Date(fiveMinutesAgo)
  );
  if (challenge) {
    return challenge;
  }
  return null;
};

function _base64ToArrayBuffer(base64) {
  const binary = Buffer.from(base64, "base64").toString("binary");
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function loadKeyPair(secret, pathId) {
  const keysDir = buildPublicDirectory("keys", "user");
  const keyPathId = path.join(keysDir, pathId);

  const files = await fs.readdir(keyPathId);
  const encFile = files.find((f) => f.endsWith(".enc"));
  if (encFile) {
    const encPath = path.join(keyPathId, encFile);
    const encryptedBuf = await fs.readFile(encPath);
    const pem = decryptPrivateKey(encryptedBuf, secret);

    const publicKey = await getPublicKeyPem(keyPathId);

    const valid = await verifyKeyPair({ publicKey, privateKey: pem }, "test");
    return { publicKey, privateKey: pem, valid };
  } else {
    return null;
  }
}

// verify public key and private key pair are valid using crypto module
async function verifyKeyPair(keyPair, data) {
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  const signature = sign.sign(keyPair.privateKey, "base64");

  const verify = crypto.createVerify("SHA256");
  verify.update(data);
  const valid = verify.verify(keyPair.publicKey, signature, "base64");
  return valid;
}

async function getPublicKeyPem(keyPathId) {
  // We'll assume there's exactly one .pem file in ./keys
  const files = await fs.readdir(keyPathId);
  const pemFile = files.find((f) => f.endsWith(".pem"));
  if (!pemFile) {
    throw new Error("No public key PEM found. Did we generate a key pair?");
  }
  const publicKeyPem = await fs.readFile(path.join(keyPathId, pemFile), "utf8");
  return publicKeyPem;
}

function generateRsaKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  return { privateKey, publicKey };
}

async function initKeyPair(secret, pathId = null) {
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (>= 16 chars).");
  }

  let valid = false;

  if (pathId) {
    try {
      const keypair = await loadKeyPair(secret, pathId);
      valid = keypair.valid;
      if (!valid) {
        throw new Error("Invalid key pair");
      }
      const { publicKey, privateKey } = keypair;
      return { pathId, publicKey, privateKey };
    } catch (err) {
      console.error(
        `[initKeyPair] Error loading existing private key: ${err.message}`
      );
      return null;
    }
  }
  if (!valid) {
    const { privateKey, publicKey } = generateRsaKeyPair();
    const encrypted = encryptPrivateKey(privateKey, secret);

    const keysDir = buildPublicDirectory("keys", "user");

    const keyId = uuidv4();
    const encFilename = `user-privateKey-${keyId}.enc`;
    const pubFilename = `user-publicKey-${keyId}.pem`;

    pathId = uuidv4();
    const keyPathId = path.join(keysDir, pathId);
    const keyPath = path.join(keyPathId, pubFilename);
    ensureDirectoryExists(keyPathId);

    await fs.writeFile(path.join(keyPath, encFilename), encrypted);
    await fs.writeFile(path.join(keyPath, pubFilename), publicKey, "utf8");

    return { pathId };
  }
}

function encryptPrivateKey(privateKeyPem, secret) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(secret, salt, 100_000, 32, "sha256");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKeyPem, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // store salt|iv|authTag|encryptedData
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

function decryptPrivateKey(encryptedBuffer, secret) {
  const salt = encryptedBuffer.slice(0, 16);
  const iv = encryptedBuffer.slice(16, 28);
  const authTag = encryptedBuffer.slice(28, 44);
  const encryptedData = encryptedBuffer.slice(44);

  const key = crypto.pbkdf2Sync(secret, salt, 100_000, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function signDataWithPrivateKey(data, privateKey) {
  if (!privateKey) {
    throw new Error("Private key is not loaded yet.");
  }
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  return signer.sign(privateKey, "base64");
}

module.exports = (app) => {
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
      'x-refresh-token, Origin, Content-Type, Accept'
    );
    next();
  });


  app.post('/api/auth/2fa/secret', [authJwt.verifyToken], controller.set2FASecret);

  app.post(
    "/api/auth/2fa/register/options",
    [authJwt.verifyToken],
    async (req, res) => {
      const userId = req.userId;

      const user = await User.findById(userId);
      if (!user) return res.status(400).json({ message: "User not found." });

      if (user._2FA_registered || user._2FA_enabled) {
        return res
          .status(400)
          .json({ message: "User already has 2FA enabled." });
      }
      /*

      if (!user._2FA_secret || user._2FA_secret === "") {
        return res
          .status(400)
          .json({ message: "User does not have a 2FA secret." });
      }
      */

      // Prepare FIDO2 attestation options
      const registrationOptions = await fido2.attestationOptions();

      registrationOptions.user = {
        id: user._id.toString(), // user handle
        name: user.username,
        displayName: user.username,
      };

      const challengeExists = await checkUserChallenge(userId);

      if (challengeExists) {
        registrationOptions.challenge = challengeExists.data;
      } else {
        const challenge = fido2.randomChallenge();
        registrationOptions.challenge = challenge;
        const newChallenge = new Challenge({
          data: challenge,
          used: false,
        });
        await newChallenge.save();
        user.challenges.push(newChallenge);
        await user.save();
      }
      // e.g. set authenticatorSelection, attestation, etc. if needed
      // registrationOptions.authenticatorSelection = { userVerification: "required" };
      // registrationOptions.attestation = "direct";

      return res.json(registrationOptions);
    }
  );

  app.post(
    "/api/auth/2fa/register/verify",
    [authJwt.verifyToken],
    async (req, res) => {
      const userId = req.userId;
      const { attestationResponse } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(400).json({ message: "User not found." });
      if (user._2FA_registered || user._2FA_enabled) {
        return res
          .status(400)
          .json({ message: "User already has 2FA registered." });
      }

      attestationResponse.rawId = _base64ToArrayBuffer(
        attestationResponse.rawId
      );

      const challengeExists = await checkUserChallenge(userId);

      if (!challengeExists) {
        return res.status(400).json({ message: "Challenge not found." });
      }

      const expectedChallenge = challengeExists.data;

      let attestationResult;
      try {
        attestationResult = await fido2.attestationResult(attestationResponse, {
          challenge: expectedChallenge,
          origin: appCypherConfig.WEBAUTHN_ORIGIN, // Adjust to your client origin
          factor: "either",
        });
      } catch (error) {
        console.error("Attestation verification failed:", error);
        return res.status(400).json({ message: "Attestation failed." });
      }

      // Attestation success. Extract credential data.
      const { authnrData } = attestationResult;
      const credId = authnrData.get("credId");
      const counter = authnrData.get("counter");
      const publicKey = authnrData.get("credentialPublicKeyPem"); // or get("credentialPublicKey")

      const user_roles_options = ["admin", "myself", "e-libre", "reviewer", "thinker", "creator", "user"];

      for (const role of user_roles_options) {
        const hasRole = await globalInclude("Role", user.role, "name", role);
        if (hasRole) {
          const { pathId } = await initKeyPair(user._2FA_secret,);

          const role = await Role.findOne({ name: role });

          if (!role) {
            return res.status(400).json({ message: "Role not found." });
          }

          const decodedSecret = decodeString(user._2FA_secret);
          const encryptedRouteId = encryptString(pathId, decodedSecret);

          const cypher = new Cypher({
            route_id: encryptedRouteId,
            secret: user._2FA_secret,
            role: role._id,
          });

          await cypher.save();

          user.cypher = cypher._id;

          break;
        }
      }

      const credential = new Credential({
        credId: _arrayBufferToBase64(credId),
        publicKey,
        counter,
      });
      await credential.save();
      // Save credential in user document
      user.credentials.push(credential._id);
      user._2FA_registered = true;
      await user.save();

      // Cleanup challenge
      const usedChallenge = await Challenge.findById(challengeExists._id);
      usedChallenge.used = true;
      await usedChallenge.save();

      return res.json({
        message: "YubiKey registered successfully",
        authUrl: `/api/auth/2fa/login`,
        token: req.token,
      });
    }
  );

  app.post("/api/auth/2fa/login/options", [authJwt.verifyToken], async (req, res) => {
    const userId = req.userId;

    const user = await User.findById(userId).populate("credentials");
    if (!user || user.credentials.length === 0) {
      return res
        .status(400)
        .json({ message: "No credentials found for user." });
    }

    if (!user._2FA_registered) {
      return res.status(400).json({ message: "2FA not registered for user." });
    }

    const assertionOptions = await fido2.assertionOptions();

    // check if user has unused challenge
    const challengeExists = await checkUserChallenge(userId);
    if (!challengeExists) {
      assertionOptions.challenge = fido2.randomChallenge();
      // Typically you'd set allowCredentials to the user's registered credential IDs

      const newChallenge = new Challenge({
        data: assertionOptions.challenge,
        used: false,
      });
      await newChallenge.save();
      user.challenges.push(newChallenge);
      await user.save();
    } else {
      assertionOptions.challenge = challengeExists.data;
    }

    assertionOptions.allowCredentials = user.credentials.map((cred) => ({
      id: cred.credId,
      type: "public-key",
    }));

    // e.g. set authenticatorSelection, attestation, etc. if needed

    return res.json(assertionOptions);
  });

  // 4b. Complete Assertion (verify)
  app.post(
    "/api/auth/login/verify",
    [authJwt.verifyToken],
    async (req, res) => {
      const userId = req.userId;
      const { assertionResponse } = req.body;

      const user = await User.findById(userId)
        .populate("credentials")
        .populate("role");
      if (!user) return res.status(400).json({ message: "User not found." });

      if (!user._2FA_registered) {
        return res
          .status(400)
          .json({ message: "2FA not registered for user." });
      }

      if (user._2FA_enabled) {
        return res
          .status(400)
          .json({ message: "2FA already enabled for user." });
      }

      const challengeExists = await checkUserChallenge(userId);

      if (!challengeExists) {
        return res.status(400).json({ message: "No challenge for this user." });
      }

      const expectedChallenge = challengeExists.data;

      const credIdBuffer = Buffer.from(assertionResponse.rawId, "base64");
      assertionResponse.rawId = _base64ToArrayBuffer(assertionResponse.rawId);

      const userHandleBuffer = _base64ToArrayBuffer(
        assertionResponse.response.userHandle
      );
      assertionResponse.response.userHandle = userHandleBuffer;

      const cred = user.credentials.find(
        (c) => c.credId === _arrayBufferToBase64(credIdBuffer)
      );

      if (!cred) {
        return res.status(400).json({ message: "Credential not found." });
      }

      const credential = await Credential.findById(cred._id);

      if (!credential) {
        return res.status(400).json({ message: "Credential not found." });
      }

      try {
        const assertionResult = await fido2.assertionResult(assertionResponse, {
          challenge: expectedChallenge,
          origin: appCypherConfig.WEBAUTHN_ORIGIN,
          factor: "either",
          publicKey: credential.publicKey,
          prevCounter: credential.counter,
        });

        // If successful, update counter
        credential.counter = assertionResult.authnrData.get("counter");
        await credential.save();

        // Clean up challenge
        const usedChallenge = await Challenge.findById(challengeExists._id);
        usedChallenge.used = true;

        await usedChallenge.save();

        // delete challenge from user
        const userChallenge = user.challenges.find(
          (challenge) => challenge._id === usedChallenge._id
        );
        user.challenges.pull(userChallenge);
        user._2FA_enabled = true;


        await user.save();
        let token = null;

        const user_roles_options = ["admin", "myself", "e-libre", "reviewer", "thinker", "creator", "user"];

        for (const role of user_roles_options) {
          const accessRole = await Role.findOne({ name: role });
          const hasRole = await globalInclude("Role", user.role, "name", role);
          if (hasRole) {
            const newUser = await User.findById(userId).select("+cypher");
            const cypher = await Cypher.findById(newUser.cypher)
            .select("+secret")
            .select("+route_id");
            if (!cypher) {
              return res.status(400).json({ message: "Cypher not found." });
            }

            const decodedSecret = decodeString(cypher.secret);
            const decryptedRouteId = decryptString(cypher.route_id, decodedSecret);

            const { privateKey } = await initKeyPair(decodedSecret, decryptedRouteId);

            const data = JSON.stringify({ access: accessRole._id.toString() });
            const signature = signDataWithPrivateKey(data, privateKey);

            token = jwt.sign(
              { userId: user._id, signature, data },
              decodedSecret, // Use env var in production
              { expiresIn: "1h" }
            );

            break;
          }
        }

        return res.json({
          message: "2FA complete",
          token,
          redirectUrl: "/api/auth/2fa/login",
        });
      } catch (error) {
        console.error("Assertion verification failed:", error);
        return res.status(400).json({ message: "Assertion failed." });
      }
    }
  );

  // In your Express app (server.js or routes file)
  // Endpoint that serves a simple HTML page to register (create) a new 2FA credential on the YubiKey.
  app.get("/api/auth/2fa/register", [authJwt.verifyToken], (req, res) => {
    const token = req.token;
    // The user must already be logged in, so we have req.userId from authJwt.verifyToken
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Register YubiKey 2FA</title>
  </head>
  <body>
    <h1>Register YubiKey 2FA</h1>
    <button id="registerBtn">Register 2FA</button>

    <script>
      // If needed, define your base64 <-> array buffer helpers:
      function _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      }

      function _base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }

      document.getElementById('registerBtn').addEventListener('click', async () => {
        try {
          // 1. Get registration (attestation) options from server
          // pass the x-access-token header
          let resp = await fetch("/api/auth/2fa/register/options", {
            method: "POST",
            headers: { "Content-Type": "application/json",
                        "x-access-token": ${token} },
          });
          let options = await resp.json();
          if (!resp.ok) {
            alert("Error getting register options: " + (options.message || "Unknown error"));
            return;
          }

          // The server might give us a challenge in raw bytes, but
          // often it's base64-encoded. If so, convert it:
          if (typeof options.challenge === "string") {
            options.challenge = _base64ToArrayBuffer(options.challenge);
          }
          // Convert user.id to ArrayBuffer if it's base64
          if (options.user && typeof options.user.id === "string") {
            options.user.id = _base64ToArrayBuffer(options.user.id);
          }

          // 2. Call navigator.credentials.create
          const credential = await navigator.credentials.create({ publicKey: options });

          // 3. Prepare the response for server
          const attestationResponse = {
            id: credential.id,
            rawId: _arrayBufferToBase64(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: _arrayBufferToBase64(credential.response.clientDataJSON),
              attestationObject: _arrayBufferToBase64(credential.response.attestationObject)
            }
          };

          // 4. Send to server for verification
          resp = await fetch("/api/auth/2fa/register/verify", {
            method: "POST",
            // x-access-token header
            headers: { "Content-Type": "application/json",
                        "x-access-token": ${token} },
            body: JSON.stringify({ attestationResponse })
          });
          const verifyResult = await resp.json();
          if (!resp.ok) {
            alert("Registration verify error: " + (verifyResult.message || "Unknown error"));
            return;
          }
          alert(verifyResult.message || "YubiKey registered successfully!");
          // use fetch to redirect to authUrl and attach token as a header
          const authePageContent = await fetch(verifyResult.authUrl, {
            method: "GET",
            headers: { 
              "Content-Type": "text/html",
              "x-access-token": verifyResult.token }
          });
          // load the content of the page
          document.write(await authePageContent.text());

        } catch (err) {
          console.error(err);
          alert("Error during registration: " + err);
        }
      });
    </script>
  </body>
</html>`;
    res.send(html);
  });

  app.get("/api/auth/2fa/login", [authJwt.verifyToken], (req, res) => {
    const token = req.token;
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Verify YubiKey 2FA</title>
  </head>
  <body>
    <h1>Verify YubiKey 2FA</h1>
    <button id="loginBtn">Complete 2FA</button>

    <script>
      function _base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
      function _arrayBufferToBase64(buffer) {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      }

      document.getElementById('loginBtn').addEventListener('click', async () => {
        try {
          // 1. Get login (assertion) options
          let resp = await fetch("/api/auth/2fa/login/options", {
            method: "POST",
            headers: { "Content-Type": "application/json",
            "x-access-token": ${token} },
          });
          let options = await resp.json();
          if (!resp.ok) {
            alert("Error getting login options: " + (options.message || "Unknown error"));
            return;
          }

          // Convert challenge from base64
          if (typeof options.challenge === "string") {
            options.challenge = _base64ToArrayBuffer(options.challenge);
          }
          // Convert allowCredentials ID fields
          if (options.allowCredentials) {
            options.allowCredentials = options.allowCredentials.map((c) => {
              return {
                id: _base64ToArrayBuffer(c.id),
                type: c.type
              };
            });
          }

          // 2. navigator.credentials.get
          const assertion = await navigator.credentials.get({ publicKey: options });

          // 3. Prepare data to send to server
          const assertionResponse = {
            id: assertion.id,
            rawId: _arrayBufferToBase64(assertion.rawId),
            type: assertion.type,
            response: {
              clientDataJSON: _arrayBufferToBase64(assertion.response.clientDataJSON),
              authenticatorData: _arrayBufferToBase64(assertion.response.authenticatorData),
              signature: _arrayBufferToBase64(assertion.response.signature),
              userHandle: assertion.response.userHandle 
                ? _arrayBufferToBase64(assertion.response.userHandle)
                : null
            }
          };

          // 4. POST to server to verify
          resp = await fetch("/api/auth/login/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json",
            "x-access-token": ${token} },
            body: JSON.stringify({ assertionResponse })
          });
          const verifyResult = await resp.json();
          if (!resp.ok) {
            alert("Assertion verification failed: " + (verifyResult.message || "Unknown error"));
            return;
          }
          alert(verifyResult.message || "2FA complete! Token: " + verifyResult.token);
          // You might want to store verifyResult.token in localStorage, etc.
          // Redirect to another page and attach the token as a header
          const authePageContent = await fetch(verifyResult.redirectUrl, {
            method: "GET",
            headers: { 
              "Content-Type": "text/html",
              "x-access-token": ${token},
              "2fa-token": verifyResult.token }
          });

          
        } catch (err) {
          console.error(err);
          alert("Error during assertion: " + err);
        }
      });
    </script>
  </body>
</html>
  `;
    res.send(html);
  });
};
