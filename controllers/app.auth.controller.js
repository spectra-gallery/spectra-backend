// controllers/initController.js
require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
const {
  initKeyPair,
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  signDataWithPrivateKey,
  getPublicKeyPem,
  encryptData,
  decryptData,
} = require("../services/yubikeyService");
const { sendSetupEmail } = require("../services/mailSetupService");

const {
  storageStatus,
  sendEncyptedData,
  verifyApiSignature,
} = require("../services/storageSetup");

const {
  initStorageApi,
  configureStorage,
  verifyStorageSignature,
  validateStorage,
  configureApiAuth,
  storageStatusOption,
  checkStorageConfig,
  getStoragePublicKey,
} = require("./app.storage.controller");

const { delay } = require("../helpers/promise.helpers");

const appCypherConfig = require("../config/app.cypher.config");

let storageSetupUrl = null;

let setupConfig = {
  initialized: false,
  registered: false,
  authenticated: false,
  publickey: false,
  storage: false,
};

let SP3CTRAToken = null;

// An in-memory object for demonstration to keep track of tokens
const pendingTokens = {};

const generateInitToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

/**
 * Controller to initialize RSA key pair on demand, send token link via email.
 * This is typically called by an Express route. For example, GET /init
 */
async function initController() {
  try {
    // 1) Initialize the keys
    await initKeyPair();
    console.log("RSA key pair ready.");

    // 2) Generate a random token
    const token = generateInitToken();
    const adminEmail = appCypherConfig.ADMIN_EMAIL || "admin@example.com";

    // 3) Store token in our in-memory data
    pendingTokens[token] = {
      token: token,
      email: adminEmail,
      used: false,
    };

    // 4) Build the setup link
    const setupUrl = `${appCypherConfig.BASE_URL}app/auth/setup?token=${token}`;

    // 5) Send the email with the setup link
    // await sendSetupEmail(adminEmail, setupUrl);
    console.log(`Setup email sent to ${adminEmail}`);
    console.log("Setup API URL: ", setupUrl);

    storageSetupUrl = await initStorageApi();
    if (storageSetupUrl) {
      console.log("Setup Storage URL: ", storageSetupUrl);
    } else {
      console.error("Error initializing storage API");
    }
  } catch (err) {
    console.error("Error initializing key pair:", err);
  }
}

if (process.env.DISABLE_AUTO_SETUP !== '1') {
  initController();
}

function getAppStatus(req, res) {
  res.json({
    initialized: setupConfig.initialized,
    registered: setupConfig.registered,
    authenticated: setupConfig.authenticated,
    publickey: setupConfig.publickey,
    storage: setupConfig.storage,
  });
}

function getPendingTokens(token) {
  return pendingTokens[token] || null;
}

// Admin: re-run handshake and key/public-key fetch with Storage
const { getStorageToken } = require("../services/storageSetup");

async function adminRehandshake(req, res) {
  try {
    const token = getStorageToken();
    // 1) Ensure storage is configured
    const cfg = await _configureStorage({ token }, { json: () => {} });
    // 2) Ensure API <-> Storage auth is valid
    const apiCfg = await _apiAuthConfig({ token }, { json: () => {} });
    // 3) Trigger a sign-and-send ping to validate signature + transport
    const payload = JSON.stringify({ apiId: appCypherConfig.API_ID });
    const result = await verifyApiSignature(payload, signDataWithPrivateKey(payload), token);

    res.json({ ok: true, step: { cfg: !!cfg, apiCfg: !!apiCfg }, result });
  } catch (e) {
    console.error('[adminRehandshake] error', e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// Admin: request a restart; assumes external supervisor (PM2/systemd) to bring it back
async function adminRestart(req, res) {
  try {
    const { service } = req.params;
    if (service === 'backend') {
      res.json({ ok: true, restarting: true });
      setTimeout(() => process.exit(1), 250);
      return;
    }
    if (service === 'storage') {
      // best-effort ping for storage to encourage a soft cycle if exposed
      try {
        // No standard restart endpoint; send a configuration nudge
        await _configureStorage({ token: req?.token }, { json: () => {} });
      } catch (_) {}
      res.json({ ok: true, message: 'Requested storage re-config; ensure your supervisor restarts it if down.' });
      return;
    }
    res.status(400).json({ ok: false, error: 'Unknown service' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

async function setupAuth(req, res) {
  const token = pendingTokens[req.query.token].token;

  const html = `
    <!DOCTYPE html>
<html>
<head>
  <title>Setup YubiKey</title>
</head>
<body>
  <h1>Register Your YubiKey</h1>
  <p>Please insert or tap your YubiKey, then press "Register".</p>
  <button id="btn-register">Register</button>
  <script>
    const btn = document.getElementById("btn-register");
    btn.onclick = async function() {
      try {
        // Get options from server
        const resp = await fetch("/app/auth/fido2/register/options?token=${token}");
        const options = await resp.json();
        console.log('rsp', options);
        // Convert certain fields from base64 to ArrayBuffer
        options.challenge = _base64ToArrayBuffer(options.challenge);
        if (options.user && options.user.id) {
          // Might be an object with .data if using Buffer in JSON
          const userId = options.user.id.data || options.user.id;
          console.log('userId', typeof userId, userId);
          options.user.id = _stringToArrayBuffer(userId);
        }
        if (options.excludeCredentials) {
          options.excludeCredentials = options.excludeCredentials.map((c) => {
            c.id = _bufferDecode(c.id.data || c.id);
            return c;
          });
        }
        
        // WebAuthn create
        const cred = await navigator.credentials.create({ publicKey: options });

        
        console.log('cred', cred);
        // Prepare data for server
        const rawId = _bufferEncode(cred.rawId);
        const attObj = _bufferEncode(cred.response.attestationObject);
        const clientDataJSON = _bufferEncode(cred.response.clientDataJSON);

        console.log('rawId', rawId);
        console.log('attObj', attObj);
        console.log('clientDataJSON', clientDataJSON);
        // Send to server
        const verify = await fetch("/app/auth/fido2/register/verify?token=${token}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawId,
            response: {
              attestationObject: attObj,
              clientDataJSON
            },
            type: cred.type
          })
        });
        const verifyJson = await verify.json();
        if (verifyJson.success) {
          alert("Registration successful! You can now close this window.");
          
          // Mark token used
          // await fetch("/app/auth/mark-token-used?token=${token}");
          // window.open(verifyJson.authUrl, "_blank");
          window.location.href = verifyJson.authUrl;
        } else {
          alert("Registration error: " + JSON.stringify(verifyJson));
        }
      } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
      }
    };

    function _base64ToArrayBuffer(base64) {
      base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
      const str = atob(base64);
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes.buffer;
    }
    function _stringToArrayBuffer(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }
    function _bufferEncode(value) {
      return btoa(String.fromCharCode(...new Uint8Array(value)));
    }
    // _bufferEncode string to ArrayBuffer using new TextDecoder().decode()
    function _bufferDecode(value) {
      return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    }
  </script>
</body>
</html>
  `;
  res.send(html);
  // send the html page in /ressources/html/setup.html public folder and serve it to the user
  // res.sendFile(path.join(__basedir, "/ressources/html/server/setup.html"));
  setupConfig.initialized = true;
}

async function markTokenUsed(req, res) {
  const { token } = req.query;
  if (token && pendingTokens[token]) {
    pendingTokens[token].used = true;
  }
  res.json({ success: true });
}

async function registrationOptions(req, res) {
  try {
    const options = await getRegistrationOptions();
    return res.json(options);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function _verifyRegistration(req, res) {
  const token = pendingTokens[req.query.token].token;
  try {
    const result = await verifyRegistration(req.body);
    const authUrl =
      appCypherConfig.BASE_URL + "app/auth/fido2/auth/setup?token=" + token;
    res.json({
      success: true,
      authUrl,
      result,
    });
    setupConfig.registered = true;
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

async function authenticationSetup(req, res) {
  const token = pendingTokens[req.query.token].token;
  const html = `
    <!DOCTYPE html>
<html>
<head>
  <title>YubiKey Authentication</title>
</head>
<body>
  <h1>Authenticate with Your YubiKey</h1>
  <p>Please insert or tap your YubiKey, then press "Authenticate".</p>
  <button id="btn-authenticate">Authenticate</button>
  <script>
    const btn = document.getElementById("btn-authenticate");

    btn.onclick = async function() {
      try {
        // Get authentication options from the server
        const resp = await fetch("/app/auth/fido2/auth/options?token=${token}");
        const options = await resp.json();

        // Convert certain fields from base64 to ArrayBuffer
        options.challenge = _base64ToArrayBuffer(options.challenge);
        if (options.allowCredentials) {
          options.allowCredentials = options.allowCredentials.map((cred) => {
            console.log('cred', cred.id);
            cred.id = _base64ToArrayBuffer(cred.id);
            console.log('cred', cred.id);
            return cred;
          });
        }

        // WebAuthn authentication
        const assertion = await navigator.credentials.get({ publicKey: options });

        console.log('Assertion:', assertion);

        // Prepare data to send to the server
        const rawId = _bufferEncode(assertion.rawId);
        const clientDataJSON = _bufferEncode(assertion.response.clientDataJSON);
        const authenticatorData = _bufferEncode(assertion.response.authenticatorData);
        const signature = _bufferEncode(assertion.response.signature);
        const userHandle = _bufferEncode(assertion.response.userHandle);

        console.log('Raw ID:', rawId);
        console.log('Client Data JSON:', clientDataJSON);
        console.log('Authenticator Data:', authenticatorData);
        console.log('Signature:', signature);
        console.log('User Handle:', userHandle);

        // Send the authentication data to the server for verification
        const verify = await fetch("/app/auth/fido2/auth/verify?token=${token}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawId,
            response: {
              clientDataJSON,
              authenticatorData,
              signature,
              userHandle
            },
            type: assertion.type
          })
        });

        const verifyJson = await verify.json();
        if (verifyJson.success) {
          alert("Authentication successful! You can now proceed.");
          
          const data = await fetch("/app/auth/storage/config?token=${token}")
          const dataJson = await data.json();
          if (dataJson.success) {
            alert(dataJson.message);
            window.location.href = dataJson.url;
          } else {
            alert("Error: " + JSON.stringify(dataJson));
          }
            
           // redirect to /app/auth/storage/status?token=${token}
           // window.location.href = "/app/auth/storage/status?token=${token}";
        } else {
          alert("Authentication failed: " + JSON.stringify(verifyJson));
        }
      } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
      }
    };

    // Utility functions for encoding and decoding
    function _base64ToArrayBuffer(base64) {
      base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
      const str = atob(base64);
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes.buffer;
    }

    function _stringToArrayBuffer(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }

    function _bufferEncode(value) {
      return btoa(String.fromCharCode(...new Uint8Array(value)));
    }

    function _bufferDecode(value) {
      return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    }
  </script>
</body>
</html>

  `;

  res.send(html);

  /*
  res.sendFile(
    path.join(__basedir, "/ressources/html/server/authentication.html")
  );
  */
}

async function authenticationOptions(req, res) {
  try {
    const options = await getAuthenticationOptions();
    res.json(options);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function _verifyAuthentication(req, res) {
  try {
    const result = await verifyAuthentication(req.body);
    res.json(result);
    setupConfig.authenticated = true;
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function signAndSend(req, res) {
  const token = (pendingTokens[req.token]?.token) || getStorageToken();
  try {
    const data = JSON.stringify({
      apiId: appCypherConfig.API_ID,
    });
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

    /*
    
    const response = await axiosInstance.post("/app/storage/verify-signature", {
      data,
      signature,
    });

    const result = response.data;

    const api_response = result.api_response;

    const parsed_response = JSON.parse(api_response);

    if (parsed_response.storageId !== appCypherConfig.API_ID) {
      throw new Error("Invalid response from server");
    } 

    return res.json({
      signature,
      data,
    });
    */
    const result = await verifyApiSignature(data, signature, token);

    if (!result) {
      throw new Error("Error verifying signature");
    }

    const { valid, api_response, session } = result;

    if (!valid) {
      throw new Error("Invalid signature");
    }

    if (api_response) {
      const parsed_response = JSON.parse(api_response);

      if (parsed_response.apiId !== appCypherConfig.API_ID) {
        throw new Error("Invalid response from server");
      }
    }

    return res.json({
      valid,
      api_response,
      session
    });
  } catch (err) {
    console.error("Error in sign-and-send:", err);
    res.status(500).json({ error: err.message });
  }
}

async function getPublicKey(req, res) {
  try {
    const publicKeyPem = await getPublicKeyPem();
    res.send(publicKeyPem);
    setupConfig.publickey = true;
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function verifySignature(req, res) {
  const { data, signature } = req.body;
  const publicKeyPem = getPublicKeyPem();
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(data);
  const isValid = verifier.verify(publicKeyPem, signature, "base64");
  res.json({ isValid });
}

async function _configureStorage(req, res) {
  const token = pendingTokens[req.token].token;

  res.json({
    success: true,
    url: storageSetupUrl,
    message: "Configuring storage...",
  });
  try {
    const result = await configureStorage();
    if (result) {
      console.log("Storage configured successfully.");
      console.log(result);
      req.session.storageKeyPath = result;

      // Validate the storage configuration
      const verification = await _validateStorage(result, token);

      if (!verification) {
        console.error("Error verifying storage configuration.");
        return;
      }

      const apiConfig = await _configureApiAuth(token);

      if (!apiConfig) {
        console.error("Error configuring API authentication.");
        return;
      }

      console.log("Storage and API configured successfully.");
      console.log("Data:", apiConfig.data);

      const parsedData = JSON.parse(apiConfig.data);

      if (parsedData.apiId !== appCypherConfig.API_ID) {
        throw new Error("Invalid response from server.");
      }
      if (!apiConfig.session) {
        throw new Error("[app.auth.controller] No session stored on storage.");
      }
      console.log(
        "[app.auth.controller] Storage and API configured successfully."
      );
      console.log(
        "[app.auth.controller] Waiting for 20 seconds... to test data encryption."
      );
      await delay(20000); // Wait for 20 seconds

      const testResult = await testEncrytion(result);

      if (!testResult) {
        console.error("Error testing encryption.");
        return;
      }

      console.log(
        "[app.auth.controller] Storage and API configuration and test complete."
      );
      console.log("[app.auth.controller] Data:", testResult.data);
      /*
      let data = {
        apiId: appCypherConfig.API_ID
      }
      data = JSON.stringify(data);
      const slug = appCypherConfig.API_ID;
      const keyPath = req.session.storageKeyPath;
      const encryptedData = await encryptDataToStorage(data, keyPath);
      const signature = signEncryptedData(encryptedData);
      const response = await sendEncyptedData(slug, signature, encryptedData);
      console.log("Result:", response);
      */
    }
  } catch (err) {
    console.error(err);
  }
}

async function testEncrytion() {
  try {
    let data = {
      apiId: appCypherConfig.API_ID,
    };
    data = JSON.stringify(data);
    const slug = appCypherConfig.API_ID;

    const encryptedData = await encryptDataToStorage(data);
    const signature = signEncryptedData(encryptedData);
    const response = await sendEncyptedData(slug, signature, encryptedData);
    console.log("[app.auth.controller] encryption test", response);
    return {
      data: response.data,
      slug: response.slug,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function _validateStorage(result, token) {
  if (setupConfig.storage) {
    return {
      verified: setupConfig.storage,
      data: "Storage already configured.",
    };
  }
  try {
    const verification = await validateStorage(result, token);

    if (verification && verification.verified) {
      console.log("Storage configuration verified.");
      console.log(verification.data);
      setupConfig.storage = verification.verified;
      return {
        verified: verification.verified,
        data: verification.data,
      };
    } else {
      console.error("Error verifying storage configuration.");
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function storageValidation(req, res) {
  const token = pendingTokens[req.token].token;

  try {
    const storageKeyPath = req.session.storageKeyPath;
    if (!storageKeyPath) {
      res.redirect("/app/auth/storage/config?token=" + token);
    }
    const verification = await _validateStorage(storageKeyPath, token);
    if (verification) {
      res.json({
        verified: verification.verified,
        api_response: verification.api_response,
      });
    } else {
      res.status(500).json({ error: "Error verifying storage configuration." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function _configureApiAuth(token) {
  try {
    const storageAuthStatus = await storageStatus();

    if (storageAuthStatus && storageAuthStatus.api) {
      return {
        success: true,
        api_ready: true,
        data: null,
        session: null,
      };
    }

    const apiAuth = await configureApiAuth(token);
    if (!apiAuth) {
      console.error("Error configuring API authentication.");
      return null;
    } else {
      console.log("API authentication configured.");
      const { success, api_ready, data, session } = apiAuth;
      if (success) {
        console.log("API Config successful.");
      }
      if (api_ready) {
        console.log("API is ready.");

        return {
          success: success,
          api_ready: api_ready,
          data: data,
          session: session,
        };
      } else {
        console.error("API is not ready.");
        return null;
      }
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function _apiAuthConfig(req, res) {
  const token = pendingTokens[req.token].token;

  try {
    const apiAuth = await _configureApiAuth(token);
    if (apiAuth) {
      res.json({
        success: apiAuth.success,
        api_ready: apiAuth.api_ready,
        data: apiAuth.data,
        session: apiAuth.session,
      });
    } else {
      res.status(500).json({ error: "Error configuring API authentication." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function _verifyStorageSignature(req, res) {
  const { data, signature } = req.body;
  const keypath = req.session.storageKeyPath;
  try {
    const result = await verifyStorageSignature(data, signature, keypath);
    res.json({
      valid: result.valid,
      api_response: data,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function _checkStorageConfig() {
  const result = await checkStorageConfig();

  const { ready, init, register, auth, data } = result;

  if (ready) {
    setupConfig.storage = true;
  }
  return {
    ready: ready,
    init: init,
    register: register,
    auth: auth,
    data: data,
  };
}

async function getStorageConfigStatus(req, res) {
  try {
    const result = await _checkStorageConfig();
    const { ready, init, register, auth, data } = result;

    // html page to display the status of the storage configuration
    const html = `
    <!DOCTYPE html>
      <html>
      <head>
        <title>Storage Configuration</title>
      </head>
      <body>
        <h1>Configure storage</h1>
        <h4>Status</h4>
        <p>Ready: ${ready}</p>
        <p>Initialized: ${init}</p>
        <p>Registered: ${register}</p>
        <p>Authenticated: ${auth}</p>
        <button id="btn-authenticate">Authenticate</button>
        <script>
          const btn = document.getElementById("btn-authenticate");

          btn.onclick = async function() {
            try {
              window.location.href = "${data}";

            } catch (err) {
              alert("Error: " + err.message);
              console.error(err);
            }
          };

        </script>
      </body>
      </html>

    `;

    if (ready) {
      res.json({
        status: "ready",
      });
    } else if (auth || register || init) {
      res.send(html);
    } else {
      throw new Error("Storage not configured.");
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const encryptDataToStorage = async (data) => {
  try {
    const { publicKey: publicKeyPem } = await getStoragePublicKey();
    const encryptedData = encryptData(data, publicKeyPem);
    return encryptedData;
  } catch (err) {
    console.error(err);
    return null;
  }
};

function signEncryptedData(data) {
  try {
    const signature = signDataWithPrivateKey(data);
    return signature;
  } catch (err) {
    console.error("Error in signEncryptedData:", err);
  }
};

async function getEncryptedData(req, res) {
  try {
    const slug = req.slug;

    const data = req.body.data;
    const decryptedData = decryptData(data);
    console.log("Decrypted data:", decryptedData);
    res.json({
      data: decryptedData,
      slug,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Export the controller and the in-memory store so we can use it in routes
module.exports = {
  getAppStatus,
  getPendingTokens,
  setupAuth,
  markTokenUsed,
  registrationOptions,
  _verifyRegistration,
  authenticationSetup,
  authenticationOptions,
  _verifyAuthentication,
  signAndSend,
  getPublicKey,
  verifySignature,
  _configureStorage,
  _verifyStorageSignature,
  storageValidation,
  _apiAuthConfig,
  getStorageConfigStatus,
  getEncryptedData,
  adminRestart,
  adminRehandshake,
};
