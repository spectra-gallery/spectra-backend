const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const axiosInstance = require("../services/axiosInstance");

const config = require("../config/auth.config");
const appCypherConfig = require("../config/app.cypher.config");

const STORAGE_API_URL = appCypherConfig.STORAGE_API_URL;

const { signDataWithPrivateKey } = require("./yubikeyService");
/**
 * Fetches a session token from the storage service.
 *
 * @async
 * @param {string} userId The user id.
 * @param {string} slug The slug.
 * @return {Promise<string>} The session token.
 * @throws Will throw an error if the request fails.
 */
async function generateSessionToken(userId, slug) {
  const token = jwt.sign({ id: userId, slug }, config.secret, {
    expiresIn: config.jwtExpiration, // 24 hours
  });

  axios.defaults.headers.common["session-token"] = token;

  return token;
}


// Make an api call to BASE_URL + 'storage/collection/upload'
exports.uploadStorageHtml = async (content, userId, slug, id) => {
  const token = await generateSessionToken(userId, slug);

  const response = await axios.post(
    BASE_URL + "storage/inscription/upload",
    { content, id },
    {
      headers: {
        "Content-Type": "Application/json",
        "session-token": token,
      },
    }
  );

  const previewUrl = response.data.previewUrl;
  const contentUrl = response.data.contentUrl;

  return { previewUrl, contentUrl };
};

exports.uploadStoragePrint = async (content, userId, slug, id) => {
  const token = await generateSessionToken(userId, slug);

  const response = await axios.post(
    BASE_URL + "storage/print/upload",
    { content, id },
    {
      headers: {
        "Content-Type": "Application/json",
        "session-token": token,
      },
    }
  );
  const contentUrl = response.data.contentUrl;

  return contentUrl;
};

exports.uploadStorageImg = async (
  previewUrl,
  captureDelay,
  cssSelector,
  hash,
  userId,
  slug
) => {
  const token = await generateSessionToken(userId, slug);

  const response = await axios.post(
    BASE_URL + "storage/inscription/generate",
    { previewUrl, captureDelay, cssSelector, hash },
    {
      headers: {
        "Content-Type": "Application/json",
        "session-token": token,
      },
    }
  );

  const imgUrl = response.data.imgUrl;

  return imgUrl;
};

exports.uploadETHStorageImg = async (
  htmlContent,
  captureDelay,
  cssSelector,
  hash,
  userId,
  slug
) => {
  const token = await generateSessionToken(userId, slug);

  const response = await axios.post(
    BASE_URL + "storage/generative/generate",
    { htmlContent, captureDelay, cssSelector, hash },
    {
      headers: {
        "Content-Type": "Application/json",
        "session-token": token,
      },
    }
  );

  const imgUrl = response.data.imgUrl;

  return imgUrl;
};

exports.uploadCollectionHtml = async (content, userId, slug, filename) => {
  const token = await generateSessionToken(userId, slug);

  const response = await axios.post(
    BASE_URL + "storage/collection/uploadhtml",
    { content, filename },
    {
      headers: {
        "Content-Type": "Application/json",
        "session-token": token,
      },
    }
  );
  const { collectionUrl, fileSize } = response.data;
  console.log(response.data);
  return { collectionUrl, fileSize };
};

exports.uploadCollectionStorageImg = async (
  previewUrl,
  captureDelay,
  cssSelector,
  hash,
  userId,
  slug
) => {
  const token = await generateSessionToken(userId, slug);

  const response = await axios.post(
    BASE_URL + "storage/collection/generate",
    { url: previewUrl, captureDelay, cssSelector, hash },
    {
      headers: {
        "Content-Type": "Application/json",
        "session-token": token,
      },
    }
  );

  return response.data;
};

/*
const setupInterceptor = () => {
  axios.interceptors.response.use(
      (response) => {
        return response;
      },
      async function(error) {
        const originalRequest = error.config;

        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const newSessionToken = await generateSessionToken();

          // Update the request headers with the new session token
          originalRequest.headers['session-token'] = newSessionToken;

          // Retry the original request with the updated headers
          return axios(originalRequest);
        }

        return Promise.reject(error);
      },
  );
}; */
