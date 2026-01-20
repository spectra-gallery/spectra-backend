const db = require("../models");
const mail = require("../middlewares/mail");
require("dotenv").config();

// yubikey sign with private key
const {
  signDataWithPrivateKey,
} = require("../services/client.yubikey.service");
const jwt = require("jsonwebtoken");
const axiosInstance = require("../services/axiosInstance");

const clientypherConfig = require("../config/client.cypher.config");

const SESSION_SECRET = clientypherConfig.SESSION_SECRET;

const clientConfig = require("../config/client.config");

const generateClientToStorageAccess = (req, res) => {
  const slug = req.body.slug;

  const token = jwt.sign({ id: req.userId, slug }, SESSION_SECRET, {
    expiresIn: clientConfig.jwtExpiration, // 24 hours
  });

  res.status(200).send({
    storageToken: token,
  });
};

const signClientDataToUpload = (req, res) => {
  const data = req.body.data;


  const form = new FormData();
  form.append("file", file);
  form.append("slug", slug);

  const signature = signDataWithPrivateKey(data);

  res.status(200).send({
    signature,
  });
};

const uploadFileToIpfs = async (file, slug) => {
  const data = new FormData();
  data.append("file", file);
  data.append("slug", slug);

  const signature = signDataWithPrivateKey(data);

  // sign the data with the private key
  const token = jwt.sign({ slug, signature }, SESSION_SECRET, {
    expiresIn: "1h",
  });

  // set the token in the header using interceptor
  axiosInstance.defaults.headers.common["spectra-api-session-token"] = token;

  try {
    const response = await axiosInstance.post("/storage/upload/api/file", data);

    const rsp = response.data;

    return {
      fileUrl: rsp.fileUrl,
    };
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  uploadFileToIpfs,
};
