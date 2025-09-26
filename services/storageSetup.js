const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const axiosInstance = require("../services/axiosInstance");

const config = require("../config/auth.config");
const appCypherConfig = require("../config/app.cypher.config");
const API_SESSION_SECRET = appCypherConfig.API_SESSION_SECRET;
let storageToken = null;

const storageStatus = async () => {
  try {
    const response = await axiosInstance.get("/app/storage/status");

    const { initialized, registered, authenticated, publickey, api } =
      response.data;

    return {
      initialized,
      registered,
      authenticated,
      publickey,
      api,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

const setupStorage = async () => {
  try {
    const response = await axiosInstance.get("/app/auth/init");

    const { success, token, setupUrl } = response.data;

    if (success) {
      storageToken = token;
      return setupUrl;
    }

    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getPublicKey = async () => {
  try {
    const response = await axiosInstance.get(
      "/app/auth/fido2/active/public-key?token=" + storageToken
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const _triggerStorageVerification = async () => {
  try {
    const response = await axiosInstance.post(
      "/app/auth/sign-and-send?token=" + storageToken
    );
    console.log("triggerStorageVerification response1", response);
    console.log("triggerStorageVerification response2", response.data);
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const triggerStorageVerification = async () => {
  try {
    // set headers

    const response = await axiosInstance.post(
      "/app/auth/sign-and-send?token=" + storageToken
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const authenticateApi = async (token) => {
  try {
    axiosInstance.defaults.headers.common["5p3-config-token"] = token;
    const response = await axiosInstance.post(
      "/app/auth/api/config?token=" + storageToken
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const sendEncyptedData = async (slug, signature, data) => {
  // sign the data with the private key
  try {
    const token = jwt.sign({ slug, signature }, API_SESSION_SECRET, {
      expiresIn: "1h",
    });

    // set the token in the header using interceptor
    axiosInstance.defaults.headers.common["spectra-api-session-token"] = token;

    const response = await axiosInstance.post("/storage/upload/api/data", {
      data,
    });

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getStorageToken = () => {
  return storageToken;
};

const verifyApiSignature = async (data, signature, token) => {
    try {
      axiosInstance.defaults.headers.common["5p3-config-token"] = token;
      const response = await axiosInstance.post("/app/storage/verify-signature", {
        data,
        signature,
      });
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
};

module.exports = {
  setupStorage,
  storageStatus,
  getPublicKey,
  getStorageToken,
  triggerStorageVerification,
  authenticateApi,
  sendEncyptedData,
  verifyApiSignature
};
