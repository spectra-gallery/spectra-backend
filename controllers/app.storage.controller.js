// authentication storage API
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const mail = require("../middlewares/mail");
const crypto = require("crypto");
require("dotenv").config();

const axiosInstance = require("../services/axiosInstance");
const appCypherConfig = require("../config/app.cypher.config");

const {
  buildPublicDirectory,
  buildDirectory,
  ensureDirectoryExists,
} = require("../helpers/path.helpers");

const {
  setupStorage,
  storageStatus,
  getPublicKey,
  getStorageToken,
  triggerStorageVerification,
  authenticateApi,
} = require("../services/storageSetup");
const path = require("path");


let cachedPublicKeyPem = null;
let cachedPublicKeyPath = null;

const initStorageApi = async () => {
  const status = await storageStatus();

  if (status) {
    if (!status.initialized) {
      const setupUrl = await setupStorage();

      return setupUrl;
    }

    return null;
  } else {
    return null;
  }
};

const configureStorage = async () => {
  try {
    const _status = await storageStatus();

    if (!_status) {
      return null;
    }

    const { ready, data } = await autoConfigureStorage(_status);

    if (ready) {
      console.log("Storage ready, waiting for verification...");
      return data;
    }

    const newStatus = await storageStatus();

    // if any field of newStatus is different from _status, then we need to reconfigure
    if (
      newStatus.initialized !== _status.initialized ||
      newStatus.registered !== _status.registered ||
      newStatus.authenticated !== _status.authenticated ||
      newStatus.publickey !== _status.publickey ||
      newStatus.api !== _status.api
    ) {
      return await configureStorage();
    }

    await delay(20000); // 20 seconds
    return await configureStorage();
  } catch (err) {
    console.error(err);
    return null;
  }
};

const autoConfigureStorageOption = async (option) => {
  console.log("Reconfiguring storage..." + option);
  try {
    const status = await storageStatus();
    if (!status) {
      return null;
    }

    const statusOption = status[option];
    if (statusOption === undefined) {
      throw new Error("Invalid option");
    }

    switch (option) {
      case "initialized":
        if (!status.initialized) {
          const setupUrl = await setupStorage();
          return {
            ready: false,
            init: true,
            register: false,
            auth: false,
            data: setupUrl,
          };
        }
        break;
      case "registered":
        if (!status.registered) {
          const storageToken = getStorageToken();
          const setupUrl = `${appCypherConfig.STORAGE_API_URL}/app/auth/init/setup?token=${storageToken}`;
          return {
            ready: false,
            init: true,
            register: true,
            auth: false,
            data: setupUrl,
          };
        }
        break;
      case "authenticated":
        if (!status.authenticated) {
          const storageToken = getStorageToken();
          const authUrl = `${appCypherConfig.STORAGE_API_URL}/app/auth/fido2/auth/setup?token=${storageToken}`;
          return {
            ready: false,
            init: true,
            register: true,
            auth: true,
            data: authUrl,
          };
        }
        break;
      case "publickey":
        if (!status.publickey) {
          const publicKeyPath = await storeStoragePublicKey();
          return {
            ready: true,
            init: true,
            register: true,
            auth: true,
            data: publicKeyPath,
          };
        }
        break;
      default:
        return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
};

// Recursive check function
async function checkStorageConfig() {
  const status = await storageStatus();
  const statusArray = [
    status.initialized,
    status.registered,
    status.authenticated,
    status.publickey,
  ];

  if (statusArray.every((option) => option === true)) {
    return {
      ready: true,
    };
  }

  const options = Object.keys(status);

  return await recursiveCheckStorageConfig(0, options, statusArray);
}

async function recursiveCheckStorageConfig(index, options, statusArray) {
  const newStatus = await storageStatus();
  const newStatusArray = [
    newStatus.initialized,
    newStatus.registered,
    newStatus.authenticated,
    newStatus.publickey,
  ];

  if (newStatusArray.every((option) => option === true)) {
    return {
      ready: true,
    };
  }

  if (statusArray[index]) {
    if (index < statusArray.length - 1) {
      return await recursiveCheckStorageConfig(
        index + 1,
        options,
        newStatusArray
      );
    } else {
      return {
        ready: true,
      };
    }
  } else {
    if (index > 0) {
      if (!newStatusArray[index - 1]) {
        return await recursiveCheckStorageConfig(
          index - 1,
          options,
          newStatusArray
        );
      } else {
        const state = await autoConfigureStorageOption(options[index]);
        return {
          ready: state.ready,
          init: state.init,
          register: state.register,
          auth: state.auth,
          data: state.data,
        };
      }
    }
    const state = await autoConfigureStorageOption(options[index]);
    return {
      ready: state.ready,
      init: state.init,
      register: state.register,
      auth: state.auth,
      data: state.data,
    };
  }
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

const autoConfigureStorage = async (status) => {
  console.log("Auto configuring storage...loop");
  try {
    const { initialized, registered, authenticated, publickey } = status;

    if (initialized && registered && authenticated && !publickey) {
      const publicKeyPath = await storeStoragePublicKey();
      return {
        ready: true,
        data: publicKeyPath,
      };
    } else if (initialized && registered && !authenticated) {
      const storageToken = getStorageToken();
      const authUrl = `${appCypherConfig.STORAGE_API_URL}/app/auth/fido2/auth/setup?token=${storageToken}`;
      return {
        ready: false,
        data: authUrl,
      };
    } else if (initialized && !registered) {
      const storageToken = getStorageToken();
      const setupUrl = `${appCypherConfig.STORAGE_API_URL}/app/auth/init/setup?token=${storageToken}`;
      return {
        ready: false,
        data: setupUrl,
      };
    } else if (!initialized) {
      const setupUrl = await setupStorage();
      return {
        ready: false,
        data: setupUrl,
      };
    }
  } catch (err) {
    console.error(err);
    return null;
  }
};
/*
const validateStorage = async (keypath, token) => {
  try {
    const _status = await storageStatus();

    if (!_status) {
      return null;
    }

    const { signature, data } = await _verficationStorageTrigger(token);

    if (signature && data) {
      const { valid } = await verifyStorageSignature(data, signature, keypath);
      if (valid) {
        console.log("[app.storage.controller] Storage verified, ready to use...");
        return {
          verified: valid,
          data: data,
        };
      }
    }
    console.log("[app.storage.controller] Storage not verified, checking in 20 seconds...");
    await delay(20000); // 20 seconds
    return await validateStorage(keypath, token);
  } catch (err) {
    console.error(err);
    return null;
  }
};
*/
/*
const _verficationStorageTrigger = async (token) => {
  try {
    const { signature, data } = await triggerStorageVerification(token);
    return {
      signature: signature,
      data: data,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};
*/

const validateStorage = async (keypath, token) => {
  try {
    const _status = await storageStatus();

    if (!_status) {
      return null;
    }

    const { valid, data } = await _verficationStorageTrigger(token);

    if (valid) {
      // const { valid } = await verifyStorageSignature(data, signature, keypath);
      // if (valid) {
        console.log("[app.storage.controller] Storage verified, ready to use...");
        return {
          verified: valid,
          data: data,
        };
      // }
    }
    console.log("[app.storage.controller] Storage not verified, checking in 20 seconds...");
    await delay(20000); // 20 seconds
    return await validateStorage(keypath, token);
  } catch (err) {
    console.error(err);
    return null;
  }
};

const _verficationStorageTrigger = async (token) => {
  try {
    const { valid, api_response } = await triggerStorageVerification(token);
    return {
      valid: valid,
      data: api_response,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};
/*
const _triggerStorageValidation = async () => {
  console.log("Auto verifying storage...loop");
  try {
    const verification = await triggerStorageVerification();
    return {
      verified: verification.valid,
      api_response: verification.api_response
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};
*/

const triggerStorageValidation = async () => {
  console.log("Auto verifying storage...loop");
  try {
    const verification = await triggerStorageVerification();
    return verification;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const storageStatusOption = async (option) => {
  const status = await storageStatus();
  if (status) {
    return status[option];
  } else {
    throw new Error("Error getting storage status");
  }
};

const storeStoragePublicKey = async () => {
  try {
    const publicKey = await getPublicKey();
    cachedPublicKeyPem = publicKey;
    // const keysDir = path.join(__dirname, "../keys", "storage");
    const keysDir = buildPublicDirectory("keys", "storage");

    const keyId = uuidv4();
    const pubFilename = `storage-publicKey-${keyId}.pem`;

    const pathId = uuidv4();
    const keyPathId = path.join(keysDir, pathId);
    const keyPath = path.join(keyPathId, pubFilename);
    ensureDirectoryExists(keyPathId);
    await fs.writeFile(keyPath, publicKey, "utf8");
    console.log("Public key stored at:", keyPath);
    cachedPublicKeyPath = keyPath;
    return keyPath;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getStoragePublicKey = async () => {
  try {
    if (cachedPublicKeyPem !== null && cachedPublicKeyPath !== null) {
      return {
        publicKey: cachedPublicKeyPem,
        keyPath: cachedPublicKeyPath,
      };
    }
    
    const apiConfigured = await storageStatusOption("publickey");
    if (!cachedPublicKeyPath || !apiConfigured) {
      cachedPublicKeyPath = await storeStoragePublicKey();
    }
    if (apiConfigured && cachedPublicKeyPath) {
      cachedPublicKeyPem = await fs.readFile(cachedPublicKeyPath, "utf8");
      return {
        publicKey: cachedPublicKeyPem,
        keyPath: cachedPublicKeyPath,
      };
    }

    cachedPublicKeyPem = await getPublicKey();
    return {
      publicKey: cachedPublicKeyPem,
      keyPath: cachedPublicKeyPath,
    }
  } catch (err) {
    console.error(err);
    return null;
  }
};

const verifyStorageSignature = async (data, signature, keypath) => {
  try {
    const { publicKey: publicKeyPem } = await getStoragePublicKey();
    if (!publicKeyPem) {
      throw new Error("Public key not found");
    }
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(data);
    let isValid = verifier.verify(publicKeyPem, signature, "base64");
    if (!isValid) {
      // Invalidate and refresh in case of rotation
      cachedPublicKeyPem = null;
      cachedPublicKeyPath = null;
      const refreshed = await getStoragePublicKey();
      if (refreshed && refreshed.publicKey) {
        const v2 = crypto.createVerify("RSA-SHA256");
        v2.update(data);
        isValid = v2.verify(refreshed.publicKey, signature, "base64");
      }
    }
    console.log("Is valid signature:", isValid);
    return {
      valid: isValid,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

const configureApiAuth = async (token) => {
  try {
    const status = await storageStatus();
    if (!status) {
      throw new Error("Error getting storage status");
    }
    // if any field status.key is different from true, then we need to reconfigure
    const { ready } = await checkStorageConfig();

    if (!ready) {
      console.log("Error configuring storage option");
      return null;
    }

    const { success, validated, data, session } = await authenticateApi(token);

    if (!success) {
      throw new Error("API authentication failed");
    }
    if (!validated) {
      console.log("[API -> Storage] authenticated:", success);
      console.log("[API -> Storage] verified:", validated);
      console.log("Checking in 10 seconds...");
      await delay(10000); // 10 seconds

      console.log("[API -> Storage] not validated, reconfiguring...");
      return await configureApiAuth(token);
    }
    if (!session) {
      console.log("[API -> Storage] session not found:", session);
    }
    console.log("[API -> Storage] authenticated:", success);
    console.log("[API -> Storage] verification:", validated);
    return {
      success: success,
      api_ready: validated,
      data: data,
      session: session,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

module.exports = {
  initStorageApi,
  storeStoragePublicKey,
  configureStorage,
  validateStorage,
  verifyStorageSignature,
  configureApiAuth,
  storageStatusOption,
  checkStorageConfig,
  getStoragePublicKey
};
