const db = require('../models');
// const mail = require('../middlewares/mail');
require('dotenv').config();
const Wallet = db.wallet;

const CryptoJS = require('crypto-js');

const fs = require('fs');

const setKey = () => {
  const newKey = generateKey();
  fs.writeFileSync('./auth/key.json', JSON.stringify({key: newKey}));

  // sendMail('pmosi76@gmail.com', newKey, 'secret');
  return newKey;
};

const setNewKey = (key) => {
  fs.writeFileSync('./auth/key.json', JSON.stringify({key: key}));
  return key;
};

const generateKey = () => {
  const key = CryptoJS.lib.WordArray.random(128 / 8).toString();
  return key;
};

const getKey = () => {
  const key = JSON.parse(fs.readFileSync('./auth/key.json')).key;
  return key;
};

const encryptPrivateKey = (privateKey) => {
  const key = getKey();
  return CryptoJS.AES.encrypt(privateKey, key).toString();
};

const decryptPrivateKey = (encryptedPrivateKey) => {
  const key = getKey();
  return CryptoJS.AES.decrypt(encryptedPrivateKey, key)
      .toString(CryptoJS.enc.Utf8);
};

const rotateKey = async () => {
  const walletObj = [];
  const wallets = await Wallet.find();

  for (const wallet of wallets) {
    walletObj.push({
      _id: wallet._id,
      privateKey: decryptPrivateKey(wallet.privateKey),
    });
  }

  const newKey = setKey();

  for (const wallet of walletObj) {
    await Wallet.findByIdAndUpdate(wallet._id, {
      privateKey: encryptPrivateKey(wallet.privateKey),
    });
  }

  // sendMail('pmosi76@gmail.com', newKey, 'secret');

  return newKey;
};

/**
 * Sends an email.
 *
 * @param {string} to - The recipient of the email.
 * @param {Object} data - The data to include in the email.
 * @param {string} type - The type of the email.
 */
/*
function sendMail(to, data, type) {
  const options = mail.getMailOptions(to, data, type);

  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}*/


module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
  rotateKey,
  setNewKey,
};
