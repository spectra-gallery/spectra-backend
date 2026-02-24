const mongoose = require('mongoose');

const db = require('../models');
const mail = require('../middlewares/mail');
const keyManager = require('../middlewares/keyManager');
const walletManager = require('../middlewares/walletManager');
require('dotenv').config();
const Wallet = db.wallet;
const Serie = db.serie;
const Fiat = db.fiat;
const Transaction = db.transaction;
const Payment = db.payment;

const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');

const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');

const Web3 = require('web3');
const web3 = new Web3();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = require("stripe")(STRIPE_SECRET_KEY);

// eslint-disable-next-line new-cap
const ECPair = ECPairFactory.ECPairFactory(ecc);

const mainnet = bitcoin.networks.bitcoin;
// const mainnet = bitcoin.networks.testnet;

bitcoin.initEccLib(ecc);

const bcrypt = require('bcryptjs');

// const WALLET_ID = process.env.WALLET_ID_0;

let nTry = 0;
const nMaxTry = 10;

let autoSendTry = 0;
const autoSendMaxTry = 10;

const MEMPOOL = process.env.MEMPOOL_ADDRESS;


/* Request user a define amount by creating a PSBT
*   that he has to sign from his wallet
* 1. Get UTXOS from payment address
* 2. Add the UTXO output to the input of the PSBT the number
*   of input depends on the amount requested
* 3. Add 2 outputs which are the payment address and the change address
* 4. Create PSBT Send the PSBT to the user wallet
* 5. User sign the PSBT with his private key and send it back to the server
* 6. Server broadcast the PSBT
*/

exports.broadcastPsbt = async (req, res) => {
  const psbtB64 = req.body.psbt;
  const amount = req.body.amount;

  const paymentId = req.body.paymentId;


  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtB64, {network: mainnet});

    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const signedTransaction = tx.toHex();
    const transactionId = tx.getId();

    console.log(transactionId);


    const result = await axios.post(`${MEMPOOL}tx`, signedTransaction);
    const transaction = result.data;
    console.log(transaction);

    const identifier = Math.random().toString(36).substring(7);
    const token = bcrypt.hashSync(identifier, 8);

    const _tx = new Transaction({
      txHash: transaction,
      token: token,
      value: amount,
    });

    await _tx.save();

    await delay(2000);

    const valid = await txDetected(transaction);

    if (!valid) {
      res.status(500).send({
        message: 'Transaction not verified',
      });
      return;
    }

    const payment = await Payment.findById(paymentId);
    payment.txHash = transaction;
    payment.amount = amount;
    payment.valid = valid;
    await payment.save();

    res.status(200).send({
      txHash: transaction,
      identifier: identifier,
      valid: valid,
    });

    sendMail('pmosi76@gmail.com', _tx, 'transaction');
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
      'Error broadcasting transaction, do you have pending transactions?',
    });
    sendMail('pmosi76@gmail.com', err, 'error');
  }
};

// Request user a define amount by creating a PSBT
// that he has to sign from his wallet
// using bitcoinjs-lib
exports.createPsbt = async (req, res) => {
  const psbt = new bitcoin.Psbt({network: mainnet});

  /*
  const amount = req.body.amount;
  console.log(amount, typeof amount);
  */

  const valueSatoshi = req.body.valueSatoshi;
  // const satPrice = req.body.satPrice;
  const serviceFees = req.body.serviceFees;
  const platformFees = req.body.platformFees;
  const autoPayFees = req.body.autoPayFees;

  // const collectionId = req.body.collectionId;

  const amount = Math.floor(valueSatoshi +
    /* satPrice +*/
    serviceFees +
    platformFees +
    autoPayFees);

  const paymentPublicKeyString = req.body.publicKey;
  // the public key of the user
  const paymentAddress = req.body.paymentAddress;
  // the payment address of the user

  console.log(amount, paymentAddress);
  // var key = ECPair.fromWIF(paymentPublicKeyString);

  // const publicKeyString = key.publicKey.toString('hex');

  const publicKeyBuffer = Buffer.from(paymentPublicKeyString, 'hex');

  const ecpair = ECPair.fromPublicKey(publicKeyBuffer, {network: mainnet});
  const p2wpkh = bitcoin.payments.p2wpkh(
      {
        pubkey: Buffer.from(ecpair.publicKey, 'hex'),
        network: mainnet,
      });

  const p2pkh = bitcoin.payments.p2pkh(
      {pubkey: Buffer.from(ecpair.publicKey, 'hex'),
        network: mainnet,
      });
  /*
  const p2sh = bitcoin.payments.p2sh({
    redeem: {output: p2wpkh.output, network: mainnet},
  });
*/

  let p2sh;
  if (isP2SHAddress(paymentAddress, mainnet) ||
  isP2WSHAddress(paymentAddress, mainnet)) {
    // eslint-disable-next-line no-unused-vars
    p2sh = bitcoin.payments.p2sh({
      redeem: {output: p2wpkh.output, network: mainnet},
    });
  } else {
    // eslint-disable-next-line no-unused-vars
    p2sh = bitcoin.payments.p2sh({
      redeem: {output: p2pkh.output, network: mainnet},
    });
  }
  const walletId = walletManager.getWalletId();
  const wallet = await Wallet.findById(walletId);
  const recipientAddress = wallet.address;

  const inputs = [];
  let inputCount = 1;
  const outputCount = 2;
  let totalAmountAvailable = 0;
  let amountAvailable = 0;
  let fee = 0;
  const utxos = [];

  const unspentOutputs = await getUnspent(paymentAddress);
  // for each UTXOs we add the value to the total amount available by the wallet
  for (const element of unspentOutputs) {
    inputs.push(element);
    totalAmountAvailable += element.value;
  }

  console.log('amount available', totalAmountAvailable);
  // Sort UTXOs from largest to smallest
  const sortedUtxos = inputs.sort(function(a, b) {
    return b.value < a.value ? -1 : 1;
  });

  do {
    fee = await txFee(inputCount, outputCount);
    utxos.push(sortedUtxos[inputCount - 1]);
    amountAvailable += sortedUtxos[inputCount - 1].value;

    inputCount += 1;
  } while (amountAvailable < amount + fee && inputCount < inputs.length);
  // while the total amount available is less
  // than the amount requested + fee we add the UTXOs
  // to the inputs of the PSBT

  // we create the inputs of the PSBT
  for (const utxo of utxos) {
    // const txid = txIdFromHash(Buffer.from(utxo.txid, 'hex'));
    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${txid}?format=hex`,
    );
    */
    const resp = await axios.get(
        `${MEMPOOL}tx/${utxo.txid}/hex`,
    );

    const rawTxHex = resp.data;
    const tx = bitcoin.Transaction.fromHex(rawTxHex, mainnet);

    // const isSegwit = rawTxHex.substring(8, 12) === '0x00';
    const isSegwit = rawTxHex.substring(8, 12) === '0001';

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xffffffff,
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[utxo.vout]);
    // const nonWitnessUtxo = tx.toBuffer();
    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};

    if (isP2SHAddress(paymentAddress, mainnet)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }

    if (isP2WSHAddress(paymentAddress, mainnet)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    // check if address is taproot
    if (isTaprootAddress(paymentAddress)) {
      const p2ktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(ecpair.publicKey, 'hex')),
        network: mainnet,
      });

      mixin.witnessUtxo = {
        script: p2ktr.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(ecpair.publicKey, 'hex'));
    }


    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
      /*
      sighashType: bitcoin.Transaction.SIGHASH_ALL |
      bitcoin.Transaction.SIGHASH_SINGLE, */
    });
  }

  // verify that the total amount available
  // is greater than the amount requested + fee


  if (amountAvailable - amount - fee < 0) {
    console.log('Balance is too low for this transaction: ' +
    amountAvailable, amount, fee);
    res.status(500).send({
      message: 'Balance is too low for this transaction: ' + amountAvailable,
    });
    return;
  }

  // computing the change amount
  const recipientAmount = amount;
  const changeAmount = amountAvailable - amount - fee;
  console.log(amountAvailable, amount, fee, changeAmount);
  // add the outputs to the PSBT, 2 outputs.
  psbt.addOutput({
    address: recipientAddress,
    value: recipientAmount,
  });
  psbt.addOutput({
    address: paymentAddress,
    value: changeAmount,
  });

  // psbt to base64 using bitcoinjs-lib
  const psbtB64 = psbt.toBase64();

  const _payment = new Payment({
    valueSatoshi: valueSatoshi,
    satPrice: 0, // satPrice
    serviceFees: serviceFees,
    platformFees: platformFees,
    autoPayFees: autoPayFees,
    address: paymentAddress,
  });

  await _payment.save();

  // send the PSBT to the client for user to sign
  res.status(200).send({
    psbt: psbtB64,
    payment: paymentAddress,
    recipient: recipientAddress,
    amount: amount,
    paymentUnspentOutputs: utxos,
    paymentId: _payment._id,
  });
};


exports.logWallet = async (req, res) => {
  const address = req.body.address;
  const privateKey = req.body.privateKey;

  // encrypt the private key using crypto-js
  // const encryptedPrivateKey =
  // CryptoJS.AES.encrypt(privateKey, KEY).toString();
  const encryptedPrivateKey = keyManager.encryptPrivateKey(privateKey);

  const wallet = new Wallet({
    address: address,
    privateKey: encryptedPrivateKey,
    password: bcrypt.hashSync(req.body.password, 8),
    // users: [req.userId]
  });

  wallet.save((err, wallet) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    res.status(200).send({
      address: wallet.address,
      id: wallet._id,
    });
  });
};

// generate a new wallet using bitcoinjs-lib
exports.generateWallet = async (req, res) => {
  const keyPair = ECPair.makeRandom();

  const privateKey = keyPair.toWIF();
  const publicKey = keyPair.publicKey.toString('hex');
  const {address} = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey});
  // const encryptedPrivateKey =
  // CryptoJS.AES.encrypt(privateKey, KEY).toString();
  const encryptedPrivateKey = keyManager.encryptPrivateKey(privateKey);

  const wallet = new Wallet({
    address: address,
    privateKey: encryptedPrivateKey,
    publicKey: publicKey,
    password: bcrypt.hashSync(req.body.password, 8),
  });

  await wallet.save();

  res.status(200).send({
    id: wallet._id,
    address: address,
  });
};

exports.setKey = async (req, res) => {
  const key = req.body.key;
  const newKey = keyManager.setNewKey(key);

  res.status(200).send({
    key: newKey,
  });
};

// rotate wallet encryption key
exports.rotateKey = async (req, res) => {
  const newKey = await keyManager.rotateKey();

  res.status(200).send({
    key: newKey,
  });
};


exports.deleteWallet = async (req, res) => {
  const id = req.body.id;

  Wallet.findByIdAndRemove(id, (err, wallet) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    res.status(200).send({
      message: 'Wallet deleted successfully!',
    });
  });
};

exports.getExchangeRate = async (req, res) => {
  try {
    const response = await axios.get(
        `https://api.blockchain.info/stats`,
    );

    const rate = response.data.market_price_usd;

    res.status(200).send({
      rate: rate,
    });
  } catch (err) {
    res.status(500).send({message: err});
    return;
  }
};

// get address total volume
exports.getAddressVolume = async (req, res) => {
  const address = req.params.address;

  const wallet = await Wallet.findOne({address: address});

  if (!wallet) {
    return res.status(404).send({message: 'Wallet Not found.'});
  }

  const volume = wallet.volume;

  res.status(200).send({
    volume: volume,
  });

  /*
    try {
      const response = await axios.get(
        `${MEMPOOL}address/${address}`
      );

      const volume = response.data.chain_stats.spent_txo_sum;

      res.status(200).send({
        volume: volume
      });

    } catch (err) {
      res.status(500).send({ message: err });
      return;

    }
  */
};

exports.logAddressVolume = (req, res) => {
  const address = req.body.address;

  logAddressVolume(address);

  res.status(200).send({
    message: 'Address volume logged successfully!',
  });

  // run logAddressVolume every hours (3600000)
  /*
  setInterval(() => {
    logAddressVolume(address);
  }, 3600000);
  */
};

/**
 * Logs the transaction volume for a given address.
 *
 * @param {string} address - The address to log the volume for.
 * @return {Promise<void>}
 * A promise that resolves when the operation is complete.
 */
async function logAddressVolume(address) {
  try {
    const response = await axios.get(
        `${MEMPOOL}address/${address}`,
    );

    const volume = response.data.chain_stats.spent_txo_sum;

    const wallet = await Wallet.findOne({address: address});
    wallet.volume = volume;
    await wallet.save();
    console.log('volume logged successfully!');
  } catch (err) {
    console.log(err);
  }
}


exports.sendTransaction = async (req, res) => {
  const id = req.body.id;
  const amount = Math.floor(req.body.amount * Math.pow(10, 8));
  const recieverAddress = req.body.recieverAddress;

  // get wallet by id
  const wallet = await Wallet.findById(id);

  if (!wallet) {
    return res.status(404).send({message: 'Wallet Not found.'});
  }

  const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      wallet.password,
  );

  if (!passwordIsValid) {
    return res.status(401).send({
      id: null,
      message: 'Invalid Password!',
    });
  }

  const address = wallet.address;
  const encryptedPrivateKey = wallet.privateKey;
  const publicKey = wallet.publicKey || '';

  /*
  const privateKey =
  CryptoJS.AES.decrypt(encryptedPrivateKey, KEY).toString(CryptoJS.enc.Utf8);
  */

  const privateKey = keyManager.decryptPrivateKey(encryptedPrivateKey);

  const transaction =
  await sendBitcoin(recieverAddress, amount, address, privateKey, publicKey);

  console.log('transaction', transaction);

  const tx = new Transaction({
    txHash: transaction,
    value: amount.toString(),
  });

  tx.save((err, tx) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }

    res.status(200).send({
      id: tx._id,
      tx: tx,
    });
  });
};

exports.autoTransaction = async (amount, recieverAddress) => {
  // get wallet by id

  const recursiveTransaction = async (amount, recieverAddress, walletId) => {
    const wallet = await Wallet.findById(walletId);


    const address = wallet.address;
    const encryptedPrivateKey = wallet.privateKey;
    const publicKey = wallet.publicKey || '';

    /*
    const privateKey =
    CryptoJS.AES.decrypt(encryptedPrivateKey, KEY).toString(CryptoJS.enc.Utf8);
    */

    const privateKey = keyManager.decryptPrivateKey(encryptedPrivateKey);

    let transaction;

    try {
      transaction =
    await sendBitcoin(recieverAddress, amount, address, privateKey, publicKey);
    } catch (err) {
      console.log(err);

      sendMail('pmosi76@gmail.com', err, 'error');

      throw new Error(err);
    }

    if (!transaction) {
      return null;
    }
    console.log('transaction', transaction);

    const tx = new Transaction({
      txHash: transaction,
      value: amount.toString(),
    });

    await tx.save();

    wallet.txs += 1;
    await wallet.save();

    sendMail('pmosi76@gmail.com', tx, 'autoPay');

    return tx._id;
  };

  let txId;
  try {
    const walletId = await walletManager.getWalletId();
    txId = await recursiveTransaction(amount, recieverAddress, walletId);
  } catch (err) {
    console.log(err);
    await delay(2000);
    if (autoSendTry < autoSendMaxTry) {
      autoSendTry += 1;

      const newWalletId = await walletManager.assignWalletId();
      // const newWalletId = await assignWalletId();

      return recursiveTransaction(amount, recieverAddress, newWalletId);
    } else {
      throw new Error(err);
    }
  }

  return txId;
};


exports.getTransactions = async (req, res) => {
  const transactions = await Transaction.find();

  const txs = [];

  for (const tx of transactions) {
    txs.push({
      id: tx._id,
      date: tx.date,
      txHash: tx.txHash,
      value: tx.value,
      valid: tx.valid,
    });
  }

  res.status(200).send({
    transactions: txs,
  });
};

exports.getWallets = async (req, res) => {
  const wallets = await Wallet.find();

  const wls = [];

  for (const wallet of wallets) {
    wls.push({
      id: wallet._id,
      address: wallet.address,
      date: wallet.date,
      balance: 0,
    });
  }

  res.status(200).send({
    wallets: wls,
  });
};

exports.getBalance = async (req, res) => {
  const id = req.params.id;

  // get wallet by id
  const wallet = await Wallet.findById(id);

  if (!wallet) {
    return res.status(404).send({message: 'Wallet Not found.'});
  }

  const address = wallet.address;

  try {
    /*
    const response = await axios.get(
        `https://blockchain.info/balance?active=${address}`,
    );

    // validate response data

    const balance = response.data[address].final_balance;
    */
    const response = await axios.get(
        `${MEMPOOL}address/${address}`,
    );

    const balance = response.data.chain_stats.funded_txo_sum -
    response.data.chain_stats.spent_txo_sum;

    res.status(200).send({
      balance: balance,
    });
  } catch (err) {
    res.status(500).send({message: err});
    return;
  }
};

// generate wallet
exports._generateWallet = async (req, res) => {
  const keyPair = ECPair.makeRandom();

  const privateKey = keyPair.toWIF();
  const publicKey = keyPair.publicKey.toString('hex');
  const {address} = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey,
    network: mainnet});

  // const encryptedPrivateKey =
  // CryptoJS.AES.encrypt(privateKey, KEY).toString();

  const encryptedPrivateKey = keyManager.encryptPrivateKey(privateKey);

  const wallet = new Wallet({
    address: address,
    privateKey: encryptedPrivateKey,
    publicKey: publicKey,
    password: '',
  });

  await wallet.save();

  res.status(200).send({
    address: address,
    id: wallet._id,
    date: wallet.date,
    balance: 0,
  });
};

// generate a bc1q address
exports.generateWallet = async (req, res) => {
  const keyPair = ECPair.makeRandom();

  const privateKey = keyPair.toWIF();
  const publicKey = keyPair.publicKey.toString('hex');
  const {address} = bitcoin.payments.p2wpkh({pubkey: keyPair.publicKey});

  const wallet = new Wallet({
    address: address,
    privateKey: privateKey,
    publicKey: publicKey,
    password: '',
  });

  await wallet.save();

  res.status(200).send({
    address: address,
    id: wallet._id,
    date: wallet.date,
    balance: 0,
  });
};


const sendBitcoin = async (recieverAddress,
    amountToSend,
    sourceAddress,
    privateKey,
    publicKey) => {
  const psbt = new bitcoin.Psbt({network: mainnet});

  const key = ECPair.fromWIF(privateKey, mainnet);

  // convert publickey to base58 string
  const publicKeyString = key.publicKey.toString('hex');
  const publicKeyBuffer = Buffer.from(publicKeyString, 'hex');


  const addressType = getAddressType(sourceAddress);

  const ecpair = ECPair.fromPublicKey(publicKeyBuffer, {network: mainnet});


  const p2wpkh = bitcoin.payments.p2wpkh(
      {pubkey: Buffer.from(ecpair.publicKey, 'hex'),
        network: mainnet,
      });
  const p2pkh = bitcoin.payments.p2pkh(
      {pubkey: Buffer.from(ecpair.publicKey, 'hex'),
        network: mainnet,
      });
  // const p2ms = bitcoin.payments.p2ms(
    // {m: 1, pubkeys: [Buffer.from(ecpair.publicKey)], network: mainnet});

  let p2sh;
  if (isP2SHAddress(sourceAddress, mainnet) ||
  isP2WSHAddress(sourceAddress, mainnet)) {
    // eslint-disable-next-line no-unused-vars
    p2sh = bitcoin.payments.p2sh({
      redeem: {output: p2wpkh.output, network: mainnet},
    });
  } else {
    // eslint-disable-next-line no-unused-vars
    p2sh = bitcoin.payments.p2sh({
      redeem: {output: p2pkh.output, network: mainnet},
    });
  }


  const satoshiToSend = amountToSend;
  let amountAvailable = 0;
  let fee = 0;
  let inputCount = 1;
  const outputCount = 2;


  const unspentOutputs = await getUnspent(sourceAddress);

  const inputs = [];
  const utxos = [];


  for (const element of unspentOutputs) {
    inputs.push(element);
  }

  const sortedUtxos = inputs.sort(function(a, b) {
    return b.value < a.value ? -1 : 1;
  });

  do {
    fee = await txFee(inputCount, outputCount);
    utxos.push(sortedUtxos[inputCount - 1]);
    amountAvailable += sortedUtxos[inputCount - 1].value;

    inputCount += 1;
  } while (amountAvailable < satoshiToSend + fee &&
    inputCount < sortedUtxos.length);


  for (const utxo of utxos) {
    // const txid = txIdFromHash(Buffer.from(utxo.txid, 'hex'));
    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${txid}?format=hex`,
    );
    */
    const resp = await axios.get(
        `${MEMPOOL}tx/${utxo.txid}/hex`,
    );

    const rawTxHex = resp.data;

    const tx = bitcoin.Transaction.fromHex(rawTxHex);


    const isSegwit = rawTxHex.substring(8, 12) === '0x00';
    // const isSegwit = rawTxHex.substring(8, 12) === '0001'

    console.log('addressType', addressType);
    console.log('isSegwit', isSegwit);

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xffffffff,
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[utxo.vout]);

    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};


    if (isP2SHAddress(sourceAddress, mainnet)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }
    if (isP2WSHAddress(sourceAddress, mainnet)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    if (isTaprootAddress(sourceAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(ecpair.publicKey, 'hex')),
        network: mainnet,
      });

      mixin.witnessUtxo = {
        script: taproot.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(ecpair.publicKey, 'hex'));
    }


    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
    });
  }

  const psbtType = psbt.getInputType(0);
  console.log(psbtType);


  if (amountAvailable - satoshiToSend - fee < 0) {
    console.log('Balance is too low for this transaction');
    console.log(amountAvailable - satoshiToSend - fee);
    return;
  }

  const change = amountAvailable - satoshiToSend - fee;
  console.log(amountAvailable, satoshiToSend, fee, change);

  psbt.addOutput({
    address: recieverAddress,
    value: satoshiToSend,
  });

  psbt.addOutput({
    address: sourceAddress,
    value: change,
  });

  psbt.signAllInputs(key);
  // psbt.signInput(0, key)


  psbt.validateSignaturesOfInput(0, validator);

  psbt.finalizeAllInputs();

  // convert

  const transaction = psbt.extractTransaction();
  const signedTransaction = transaction.toHex();
  const transactionId = transaction.getId();

  console.log('signedTransaction', signedTransaction);
  console.log('transactionId', transactionId);


  const result = await axios.post(`${MEMPOOL}tx`, signedTransaction);
  const txId = result.data;

  return txId;
};

const validator = (pubkey, msghash, signature) => {
  return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
};

const txFee = async (inputCount, outputCount) => {
  const baseTxSize = 10;
  const inSize = 180;
  const outSize = 34;

  const txSize =
    baseTxSize +
    inputCount * inSize +
    outputCount * outSize +
    outSize;

  const rs = await axios.get(
      `${MEMPOOL}v1/fees/recommended`,
  );

  const fee = Math.ceil(rs.data.halfHourFee * txSize); // 1024

  return fee;
};

/*

const txFeeByAddress = async (address, inputCount, outputCount) => {
  let baseTxSize = 10;
  let inSize;
  let outSize;

  if (isP2SHAddress(address, mainnet) ||
  isP2WSHAddress(address, mainnet)) {
    baseTxSize = 32;
    inSize = 148;
    outSize = 32;
  } else {
    inSize = 180;
    outSize = 34;
  }

  const transactionSize =
  baseTxSize +
  inputCount * inSize +
  outputCount * outSize;

  const rs = await axios.get(
      `${MEMPOOL}v1/fees/recommended`,
  );

  return transactionSize * rs.data.halfHourFee;
};

const txFeeByRate = async (inputCount, outputCount, feeRate) => {
  const transactionSize = inputCount * 180 + outputCount * 34 + 10 - inputCount;

  const fee = Math.ceil(feeRate * transactionSize); // 1024

  return fee;
};

*/

exports.autoUTXOS = async (recieverAddress) => {
  // get wallet by id
  const walletId = walletManager.getWalletId();
  const wallet = await Wallet.findById(walletId);


  const address = wallet.address;
  const encryptedPrivateKey = wallet.privateKey;

  const privateKey = keyManager.decryptPrivateKey(encryptedPrivateKey);

  let transaction;

  try {
    transaction = await sendUTXOS(recieverAddress, privateKey, address);
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }

  if (!transaction) {
    return;
  }

  console.log('transaction', transaction);

  const tx = new Transaction({
    txHash: transaction,
    value: 1200,
  });

  await tx.save();

  wallet.txs += 1;
  await wallet.save();

  sendMail('pmosi76@gmail.com', tx, 'autoPay');

  return tx.txHash;
};

/*
Send 2 utxos of 600 satoshis each to the address
*/
const sendUTXOS = async (recieverAddress, privateKey, sourceAddress) => {
  const psbt = new bitcoin.Psbt({network: mainnet});

  const key = ECPair.fromWIF(privateKey, mainnet);

  // convert publickey to base58 string
  const publicKeyString = key.publicKey.toString('hex');
  const publicKeyBuffer = Buffer.from(publicKeyString, 'hex');

  // const addressType = getAddressType(sourceAddress);

  const ecpair = ECPair.fromPublicKey(publicKeyBuffer, {network: mainnet});

  const p2wpkh = bitcoin.payments.p2wpkh(
      {pubkey: Buffer.from(ecpair.publicKey, 'hex'),
        network: mainnet,
      });
  const p2pkh = bitcoin.payments.p2pkh(
      {pubkey: Buffer.from(ecpair.publicKey, 'hex'),
        network: mainnet,
      });
  // const p2ms = bitcoin.payments.p2ms(
  // {m: 1, pubkeys: [Buffer.from(ecpair.publicKey)], network: mainnet});

  let p2sh;
  if (isP2SHAddress(sourceAddress, mainnet) ||
isP2WSHAddress(sourceAddress, mainnet)) {
  // eslint-disable-next-line no-unused-vars
    p2sh = bitcoin.payments.p2sh({
      redeem: {output: p2wpkh.output, network: mainnet},
    });
  } else {
  // eslint-disable-next-line no-unused-vars
    p2sh = bitcoin.payments.p2sh({
      redeem: {output: p2pkh.output, network: mainnet},
    });
  }

  const satoshiToSend = 600;
  let amountAvailable = 0;
  let fee = 0;
  let inputCount = 1;
  const outputCount = 2;

  const unspentOutputs = await getUnspent(sourceAddress);

  const inputs = [];
  const utxos = [];

  for (const element of unspentOutputs) {
    inputs.push(element);
  }

  const sortedUtxos = inputs.sort(function(a, b) {
    return b.value < a.value ? -1 : 1;
  });

  do {
    fee = await txFee(inputCount, outputCount);
    utxos.push(sortedUtxos[inputCount - 1]);
    amountAvailable += sortedUtxos[inputCount - 1].value;

    inputCount += 1;
  } while (amountAvailable < satoshiToSend + fee &&
  inputCount < sortedUtxos.length);


  for (const utxo of utxos) {
    // const txid = txIdFromHash(Buffer.from(utxo.txid, 'hex'));
    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${txid}?format=hex`,
    );
    */
    const resp = await axios.get(
        `${MEMPOOL}tx/${utxo.txid}/hex`,
    );

    const rawTxHex = resp.data;

    const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const isSegwit = rawTxHex.substring(8, 12) === '0x00';

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xffffffff,
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[utxo.vout]);

    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};

    if (isP2SHAddress(sourceAddress, mainnet)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }
    if (isP2WSHAddress(sourceAddress, mainnet)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    if (isTaprootAddress(sourceAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(ecpair.publicKey, 'hex')),
        network: mainnet,
      });

      mixin.witnessUtxo = {
        script: taproot.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(ecpair.publicKey, 'hex'));
    }

    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
    });
  }

  const psbtType = psbt.getInputType(0);

  console.log(psbtType);

  // fee = await txFee(inputCount, outputCount);
  const amountToSend = satoshiToSend * 2;

  if (amountAvailable - amountToSend - fee < 0) {
    console.log('Balance is too low for this transaction');
    console.log(amountAvailable - amountToSend - fee);
    throw new Error('Balance is too low for this transaction');
  }

  const change = amountAvailable - amountToSend - fee;
  console.log(amountAvailable, amountToSend, fee, change);

  psbt.addOutput({
    address: recieverAddress,
    value: satoshiToSend,
  });

  psbt.addOutput({
    address: recieverAddress,
    value: satoshiToSend,
  });

  psbt.addOutput({
    address: sourceAddress,
    value: change,
  });

  psbt.signAllInputs(key);

  psbt.validateSignaturesOfInput(0, validator);

  psbt.finalizeAllInputs();

  // convert

  const transaction = psbt.extractTransaction();
  const signedTransaction = transaction.toHex();
  const transactionId = transaction.getId();

  console.log('signedTransaction', signedTransaction);
  console.log('transactionId', transactionId);

  try {
    const result = await axios.post(`${MEMPOOL}tx`, signedTransaction);
    const txId = result.data;

    return txId;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};

/**
 * Determines the type of a Bitcoin address.
 *
 * @param {string} address - The Bitcoin address.
 * @return {string|null}
 * The type of the address ('P2PKH', 'P2SH', or 'bech32'),
 * or null if the address is not valid.
 */
function getAddressType(address) {
  try {
    const decoded = bitcoin.address.fromBase58Check(address, mainnet);

    if (decoded.version === mainnet.pubKeyHash) {
      return 'P2PKH'; // (3...)
    } else if (decoded.version === mainnet.scriptHash &&
      decoded.hash.length === 20) {
      return 'P2SH'; // (1...)
    }
  } catch (error) {
    if (isBech32(address)) {
      return 'bech32'; // (bc1...)
    }
  }
}

/**
 * Checks if a Bitcoin address is a Bech32 address.
 *
 * @param {string} address - The Bitcoin address.
 * @return {boolean} True if the address is a Bech32 address, false otherwise.
 */
function isBech32(address) {
  try {
    bitcoin.address.fromBech32(address, mainnet);
    return true;
  } catch (error) {
    return false;
  }
}

exports.isBech32 = isBech32;

/**
 * Converts a public key to an X-only public key.
 *
 * @param {Buffer} pubKey - The public key.
 * @return {Buffer} The X-only public key.
 */
const toXOnly = (pubKey) => {
  if (pubKey.length === 32) {
    return pubKey;
  } else {
    return pubKey.subarray(1, 33);
  }
};

/**
 * Checks if a Bitcoin address is a Taproot address.
 *
 * @param {string} address - The Bitcoin address.
 * @return {boolean} True if the address is a Taproot address, false otherwise.
 */
function isTaprootAddress(address) {
  try {
    const parsedAddress = bitcoin.address.fromBech32(address, mainnet);
    console.log(parsedAddress.version, parsedAddress.data.length);
    if (
      parsedAddress.version === 1 && // Taproot version (0)
      parsedAddress.data.length === 32 // 32 bytes in data
    ) {
      return true;
    }
  } catch (error) {
    // Invalid or non-bech32 address
  }
  return false;
}

// check how many utxos are available for a given address
// and how much are needed to send the amount requested
exports.checkUTXOS = async (req, res) => {
  const address = req.query.address;
  const amount = parseInt(req.query.amount);

  const unspentOutputs = await getUnspent(address);

  const inputs = [];
  let inputCount = 1;
  const outputCount = 2;
  let amountAvailable = 0;
  let fee = 0;
  const utxos = [];

  if (unspentOutputs.length === 0) {
    return res.status(200).send({
      message: 'No UTXOS available for this address',
    });
  }

  for (const _element of unspentOutputs) {
    const element = await _element;
    inputs.push(element);
  }

  const sortedUtxos = inputs.sort(function(a, b) {
    return b.value < a.value ? -1 : 1;
  });

  do {
    fee = await txFee(inputCount, outputCount);
    utxos.push(sortedUtxos[inputCount - 1]);
    amountAvailable += sortedUtxos[inputCount - 1].value;

    inputCount += 1;
  } while (amountAvailable < amount + fee && inputCount < inputs.length);


  res.status(200).send({
    inputs: inputCount,
    utxosLength: utxos.length,
    amountAvailable: amountAvailable,
    fee: fee,
  });
};

// check the fees for the transaction payment to satscribe
exports.feesUTXOS = async (amount) => {
  const walletId = walletManager.getWalletId();
  const wallet = await Wallet.findById(walletId);
  const address = wallet.address;

  const unspentOutputs = await getUnspent(address);

  const inputs = [];
  let inputCount = 1;
  const outputCount = 2;
  let amountAvailable = 0;
  let fee = 0;
  const utxos = [];

  for (const element of unspentOutputs) {
    inputs.push(element);
  }

  if (inputs.length === 0) {
    return null;
  }

  const sortedUtxos = inputs.sort(function(a, b) {
    return b.value < a.value ? -1 : 1;
  });

  do {
    fee = await txFee(inputCount, outputCount);
    utxos.push(sortedUtxos[inputCount - 1]);
    amountAvailable += sortedUtxos[inputCount - 1].value;

    inputCount += 1;
  } while (amountAvailable < amount + fee && inputCount < inputs.length);


  return fee;
};

/**
 * Retrieves the unspent transaction outputs (UTXOs) for a given address.
 *
 * @param {string} address - The address to fetch the UTXOs for.
 * @return {Promise<Object>} A promise that resolves with the UTXOs.
 */
async function getUnspent(address) {
  /*
  const response = await axios.get(
      `https://blockchain.info/unspent?active=${address}`,
  );
  */
  const response = await axios.get(
      `${MEMPOOL}address/${address}/utxo`,
  );

  return response.data;
}
/*
async function getTransactions2(address) {
  try {
    const response = await axios.get(
        `https://blockchain.info/rawaddr/${address}`,
    );

    return response.data.txs;
  } catch (error) {
    console.log(error);
    return [];
  }
}
*/

/**
 * Retrieves the transactions for a given address.
 *
 * @param {string} address - The address to fetch the transactions for.
 * @return {Promise<Object>} A promise that resolves with the transactions.
 */
async function getTransactions(address) {
  try {
    const response = await axios.get(
        `${MEMPOOL}address/${address}/txs`,
    );

    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
}

exports.getTransactionsByAddress = async (req, res) => {
  const address = req.params.address;

  const transactions = await getTransactions(address);
  const txs = [];

  for (const tx of transactions) {
    const vins = [];
    const vouts = [];

    for (const vin of tx.vin) {
      vins.push({
        value: vin.prevout.value,
        addresses: vin.prevout.scriptpubkey_address,
      });
    }

    for (const vout of tx.vout) {
      vouts.push({
        value: vout.value,
        addresses: vout.scriptpubkey_address,
      });
    }

    txs.push({
      id: tx.txid,
      date: tx.status.block_time,
      vins: vins,
      vouts: vouts,
    });
  }

  // txs.sort((a, b) => a.date - b.date);

  res.status(200).send({
    transactions: txs,
  });
};

/**
 * Has unconfirmed transactions for a given address.
 * @param {string} address - The address to check.
 */
/*
async function hasUnconfirmedTransactions(address) {
  const transactions = await getTransactions(address);

  const unconfirmedTransactions = transactions.filter(
      (tx) => tx.status.confirmed === false,
  );

  return unconfirmedTransactions.length > 0;
};
*/

/**
 * Get a wallet with unconfirmed transactions. returns the wallet id
 * @param {string} address - The address to check.
 * @return {string} The wallet id.
 */
/*
async function getWalletWithUnconfirmedTransactions() {
  const wallets = await Wallet.find();

  // get wallet balance and sort by descending order
  const balances = await Promise.all(wallets.map(async (wallet) => {
    const balance = await getBalance(wallet.address);
    return {
      id: wallet._id,
      address: wallet.address,
      balance: balance,
    };
  }));

  const sortedBalances = balances.sort((a, b) => b.balance - a.balance);

  for (const wallet of sortedBalances) {
    const hasUnconfirmed = await hasUnconfirmedTransactions(wallet.address);

    if (hasUnconfirmed) {
      return wallet._id;
    }
  }
}
*/

/**
 * Checks if a transaction exists for a given address.
 *
 * @param {string} txid - The transaction ID.
 * @param {string} address - The address to check.
 * @return {Promise<boolean>}
 * A promise that resolves with true if the transaction exists, false otherwise.
 */
async function transactionDetected(txid, address) {
  const transactions = await getTransactions(address);

  const txExists = transactions.some((tx) => tx.txid === txid);

  return txExists;
}

/**
 * Checks if a transaction exists for the wallet.
 *
 * @param {string} txid - The transaction ID.
 * @return {Promise<boolean>}
 * A promise that resolves with true if the transaction exists, false otherwise.
 */
async function txDetected(txid) {
  const walletId = walletManager.getWalletId();
  const wallet = await Wallet.findById(walletId);
  const address = wallet.address;

  return new Promise(async (resolve, reject) => {
    const getTx = async (_txid) => {
      const txExists = await transactionDetected(_txid, address);


      if (!txExists && nTry < nMaxTry) {
        console.log('try again loop');
        await delay(10000);
        nTry += 1;
        return await getTx(_txid);
      }
      if (txExists) {
        console.log('valid', txExists);

        const tx = await Transaction.findOne({txHash: _txid});

        tx.valid = txExists;
        await tx.save();
        nTry = 0;

        resolve(txExists);
      }

      if (nTry >= nMaxTry) {
        reject(new Error('Max tries reached, tx not found.'));
      }
    };

    await getTx(txid);
  });
}

exports.transactionDetected = async (req, res) => {
  const txid = req.params.id;

  const transacion = await Transaction.findOne({txHash: txid});

  res.status(200).send({
    valid: transacion.valid,
  });
};

/**
 * Checks if a given address is a Pay-to-Script-Hash (P2SH) address.
 *
 * @param {string} address - The address to check.
 * @param {bitcoin.Network} network - The Bitcoin network to use.
 * @return {boolean} True if the address is a P2SH address, false otherwise.
 */
function isP2SHAddress(
    address,
    network,
) {
  try {
    const {version, hash} = bitcoin.address.fromBase58Check(address);
    return version === network.scriptHash && hash.length === 20;
  } catch (error) {
    return false;
  }
}

exports.isP2SHAddress = isP2SHAddress;

/**
 * Checks if a Bitcoin address is a
 * Pay-to-Witness-Public-Key-Hash (P2WSH) address.
 *
 * @param {string} address - The Bitcoin address.
 * @param {bitcoin.Network} network - The Bitcoin network to use.
 * @return {boolean} True if the address is a P2WSH address, false otherwise.
 */
function isP2WSHAddress(
    address,
    network,
) {
  try {
    const {version, data} = bitcoin.address.fromBech32(address);
    return version === network.scriptHash && data.length === 32;
  } catch (error) {
    return false;
  }
}

// is a valid bitcoin address
exports.isValidAddress = async (req, res) => {
  const address = req.params.address;

  const chain = req.query.chain;

  let isValid;

  if (chain === 'bitcoin') {
  isValid = isTaprootAddress(address) ||
      isP2SHAddress(address, mainnet) ||
      isP2WSHAddress(address, mainnet) ||
      isBech32(address);
  } else if (chain === 'ethereum') {
    isValid = web3.utils.isAddress(address);
  } else {
    isValid = mongoose.Types.ObjectId.isValid(address);
  }

  res.status(200).send({
    valid: isValid,
  });
};

/**
 * Converts a transaction hash to a transaction ID.
 *
 * @param {Buffer} hash - The transaction hash.
 * @return {string} The transaction ID.
 */
/*
function txIdFromHash(hash) {
  return hash.reverse().toString('hex');
}*/

/**
 * Retrieves the unspent transaction output (UTXO) for a given output.
 *
 * @param {Object} out - The output to fetch the UTXO for.
 * @return {Object} The UTXO.
 */
function getWitnessUtxo(out) {
  delete out.address;
  out.script = Buffer.from(out.script, 'hex');
  return out;
}

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Schedules a task to be run at a specified time.
 *
 * @param {string} address - The address to log the volume for.
 * @param {Function} task - The task to run.
 * @return {void}
 */
function scheduleTask(address) {
  setTimeout(async () => {
    try {
      await logAddressVolume(address);
    } catch (error) {
      console.error('An error occurred:', error);
    }
    scheduleTask();
  }, 3600000);
}

exports.scheduleTask = (req, res) => {
  const address = req.body.address;

  scheduleTask(address);

  res.status(200).send({
    message: 'Task scheduled successfully!',
  });
};

exports.getCurrentWallet = async (req, res) => {
  const walletId = walletManager.getWalletId();
  const wallet = await Wallet.findById(walletId);

  if (!wallet) {
    return res.status(404).send({message: 'Wallet Not found.'});
  }
  const balance = await getBalance(wallet.address);

  res.status(200).send({
    id: wallet._id,
    address: wallet.address,
    txs: wallet.txs,
    balance: balance,
  });
};

// assign wallet id to the wallet with the least txs
exports.assignWalletId = async (req, res) => {
  // get wallet with the least txs
  const id = await walletManager.assignWalletId();

  if (!id) {
    res.status(500).send({
      message: 'No wallets with sufficient balance found.',
    });
    return;
  }

  res.status(200).send({
    id: id,
  });
/*
  setInterval(() => {
    assignWalletId();
  }, 600000); // 10min
*/
};

exports.assignWalletById = async (req, res) => {
  const id = req.params.id;

  const wallet = await Wallet.findById(id);

  if (!wallet) {
    return res.status(404).send({message: 'Wallet Not found.'});
  }

  walletManager.setWalletId(id);

  res.status(200).send({
    id: id,
  });
};

exports.getPayments = async (req, res) => {
  const payments = await Payment.find({valid: true});

  const pmts = [];

  for (const payment of payments) {
    pmts.push({
      id: payment._id,
      date: payment.date,
      amount: payment.amount,
      valid: payment.valid,
      valueSatoshi: payment.valueSatoshi,
      satPrice: payment.satPrice,
      txHash: payment.txHash,
      serviceFees: payment.serviceFees,
      autoPayFees: payment.autoPayFees,
      address: payment.address,
    });
  }

  res.status(200).send({
    payments: pmts,
  });
};

/**
 * Assigns a wallet ID to the wallet with the least transactions and
 * a balance of at least 60000.
 * If no such wallet is found, assigns the wallet ID
 * to the wallet with the highest balance.
 *
 * @return {Promise<string>}
 * A promise that resolves with the ID of the assigned wallet.
 */
/*
async function assignWalletId() {
  // get wallet with the least txs
  const wallets = await Wallet.find()
      .sort({txs: 1})
      .exec();

  for (const wallet of wallets) {
    const balance = await getBalance(wallet.address);
    const hasUnconfirmedTx = await hasUnconfirmedTransactions(wallet.address);
    if (balance >= 60000 && !hasUnconfirmedTx) {
      console.log('wallet switch', wallet._id, wallet.address);
      WALLET_ID = wallet._id;
      sendMail('pmosi76@gmail.com', wallet, 'walletSwitch');
      return WALLET_ID;
    }
  }
  console.log('no wallet with sufficient balance found');
  // sort wallets by balance from highest to lowest
  const balances = await Promise.all(wallets.map(async (wallet) => {
    const balance = await getBalance(wallet.address);
    return {
      id: wallet._id,
      balance: balance,
    };
  }));

  const sortedBalances = balances.sort((a, b) => b.balance - a.balance);

  // get wallet with the highest balance
  const wallet = sortedBalances[0];
  console.log('wallet switch', wallet.id, wallet.balance);
  WALLET_ID = wallet.id;

  sendMail('pmosi76@gmail.com', wallet, 'walletSwitch');
  return wallet.id;
}
*/


/**
 * Retrieves the balance for a given wallet.
 *
 * @param {string} address - The address to fetch the balance for.
 * @return {Promise<number>}
 * A promise that resolves with the balance of the wallet.
 */
async function getBalance(address) {
  try {
    /*
    const response = await axios.get(
        `https://blockchain.info/balance?active=${address}`,
    );

    const balance = response.data[address].final_balance;
    */
    const response = await axios.get(
        `${MEMPOOL}address/${address}`,
    );

    const balance = response.data.chain_stats.funded_txo_sum -
    response.data.chain_stats.spent_txo_sum;

    return balance;
  } catch (error) {
    console.log(error);
  }
}

/** ----- Print Payment Controller ---- */
exports.createPrintPaymentIntent = async (req, res) => {

  const id = req.params.id;
  const price = req.body.price * 100;
  const currency = req.body.currency;

  const userId = req.userId;

  const serie = await Serie.findById(id);
  const amount = serie.priceUSD * 100;

  if (amount !== price) {
    return res.status(400).send({message: 'Price mismatch.'});
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: currency,
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.status(200).send({
    clientSecret: paymentIntent.client_secret,
  });

};


/**
 * Sends an email.
 *
 * @param {string} to - The recipient of the email.
 * @param {Object} data - The data to include in the email.
 * @param {string} type - The type of the email.
 */
function sendMail(to, data, type) {
  const options = mail.getMailOptions(to, data, type);

  mail.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}
