const db = require('../models');
const mail = require('../middlewares/mail');
const discord = require('../middlewares/discord');
require('dotenv').config();
const User = db.user;
const Collection = db.collection;
const Inscription = db.inscription;
const Ordinal = db.ordinal;
const Psbt = db.psbt;
const Buying = db.buying;
const Bid = db.bid;
const Mint = db.mint;

const ordinalController = require('./ordinal.controller');
const walletController = require('./wallet.controller');

const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');

// const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');


// const {BIP32Factory} = require('bip32');
// const bip32 = BIP32Factory(ecc);

// eslint-disable-next-line new-cap
// const ECPair = ECPairFactory.ECPairFactory(ecc);

const network = bitcoin.networks.bitcoin;
// const network = bitcoin.networks.testnet;

const ORDINAL_API = process.env.ORDINAL_API;
const HIRO_API_KEY = process.env.HIRO_API_KEY;

const MEMPOOL = process.env.MEMPOOL_ADDRESS;


bitcoin.initEccLib(ecc);

const PLATFORM_FEES = process.env.PLATFORM_FEES;
const PLATFORM_FEE_ADDRESS = process.env.PAY_ADDRESS_0;


exports.createOrdinalListingPsbt = async (req, res) => {
  const psbt = new bitcoin.Psbt({network});
  const id = req.body.id;

  const ordinal = await Ordinal.findOne({id: id});

  if (!ordinal) {
    res.status(500).send({
      message: 'ordinal not found',
    });
    console.log('ordinal not found');
    return;
  }

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const cardinalAddress = req.body.cardinalAddress;
  const publicKey = req.body.publicKey; // seller public key
  const amount = req.body.amount; // listing price in satoshis
  const output = ordinal.output;

  // 5%

  /*
  const key = ECPair.fromPublicKey(
    Buffer.from(publicKey, 'hex'),
    { network },
  );*/

  // get taproot internal key from address and public key

  const tapInternalKey = publicKey;


  const [ordinalUtxoTxId, ordinalUtxoVout] = output.split(':');

  /*
  const resp = await axios.get(
      `https://blockchain.info/rawtx/${ordinalUtxoTxId}?format=hex`,
  );

  const rawTxHex = resp.data;
  */

  const rawTxHex = await getRawTx(ordinalUtxoTxId);


  const tx = bitcoin.Transaction.fromHex(
      rawTxHex,
  );

  if (!tapInternalKey) {
    for (const output in tx.outs) {
      if (!tx.outs.hasOwnProperty(output)) continue;
      try {
        tx.setWitness(parseInt(output), []);
      } catch { }
    }
  }


  const input = {
    hash: ordinalUtxoTxId,
    index: parseInt(ordinalUtxoVout),
    nonWitnessUtxo: tx.toBuffer(),
    witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
    sighashType: bitcoin.Transaction.SIGHASH_SINGLE |
      bitcoin.Transaction.SIGHASH_ANYONECANPAY,

  };

  if (tapInternalKey) {
    input.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(tapInternalKey, 'hex'),
    );
  }

  psbt.addInput(input);

  const sellerOutput = getSellerOrdOutputValue(
      amount,
      parseInt(inscription.royalty),
      parseInt(ordinal.outputValue),
  );

  psbt.addOutput({
    address: cardinalAddress, // seller cardinal address
    value: sellerOutput,
  });

  const unsignedListingPSBTBase64 = psbt.toBase64();


  res.status(200).send({
    id: id,
    pstbtBase64: unsignedListingPSBTBase64,
    recipient: cardinalAddress,
  });
};

exports.verifyOrdinalListingPsbt = async (req, res) => {
  const id = req.body.id;
  const publicKey = req.body.publicKey;
  const psbtHex = req.body.signedListingPSBTBase64;
  const cardinalAddress = req.body.cardinalAddress;

  // convert hex to base64
  const psbtBase64 = Buffer.from(psbtHex, 'hex').toString('base64');


  await new Psbt({
    tokenId: id,
    signedListingPSBTBase64: psbtBase64,
    paymentAddress: cardinalAddress,
    publicKey: publicKey,
  }).save();

  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
    network,
  });

  // Verify that the seller has signed the PSBT if
  // Ordinal is held on a taproot and tapInternalKey is present
  psbt.data.inputs.forEach((input) => {
    /*
        if (input.tapInternalKey) {
          const finalScriptWitness = input.finalScriptWitness;
          console.log(input)
          if (finalScriptWitness && finalScriptWitness.length > 0) {
            // // Validate that the finalScriptWitness
            // is not empty (and not just the initial value,
            // without the tapKeySig)
            if (finalScriptWitness.toString('hex') === '0141') {
              console.log("invalid signature,
              no taproot signature present on the finalScriptWitness");
              return res.status(500).send({
                message: "invalid signature,
                no taproot signature present on the finalScriptWitness",
              });

            }
          } else {
            console.log("invalid signature, no finalScriptWitness");
            return res.status(500).send({
              message: "invalid signature, no finalScriptWitness",
            });

          }

        }*/
  });

  // get public key from psbt


  // psbt.signAllInputs(key);
  // psbt.validateSignaturesOfInput(schnorrValidator);

  if (psbt.inputCount !== 1) {
    res.status(500).send({
      message: 'invalid input count',
    });
    console.log('invalid input count');
    return;
  }

  const utxoOutput = generateTxidFromHash(psbt.txInputs[0].hash) +
  ':' + psbt.txInputs[0].index;

  // get ordinal by output to verfy that
  // the item is the same as the seller wants
  const ordinal = await Ordinal.findOne({output: utxoOutput});

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const collection = await Collection.findById(inscription.collectionRef);

  if (!ordinal) {
    res.status(500).send({
      message: 'no ordinal matching output',
    });
    console.log('no ordinal matching output');
    return;
  }

  if (ordinal.id !== id) {
    res.status(500).send({
      message: 'id mismatch',
    });
    console.log('id mismatch');
    return;
  }

  // verify that the item price matches the output value
  const output = psbt.txOutputs[0];
  const expectedOutput = getSellerOrdOutputValue(
      parseInt(ordinal.price),
      parseInt(inscription.royalty), // royalty
      parseInt(ordinal.outputValue),
  );

  if (output.value !== expectedOutput) {
    res.status(500).send({
      message: 'invalid price',
    });
    console.log('invalid price');
    return;
  }

  if (output.address !== cardinalAddress) {
    res.status(500).send({
      message: 'invalid address',
    });
    console.log('invalid address 1');
    return;
  }

  const _txId = generateTxidFromHash(psbt.txInputs[0].hash);

  /*
  const resp = await axios.get(
      `https://blockchain.info/rawtx/${_txId}?format=hex`,
  );

  const rawTxHex = resp.data;
  */
  const rawTxHex = await getRawTx(_txId);

  const sellerAddressFromPSBT = bitcoin.address.fromOutputScript(
      bitcoin.Transaction.fromHex(rawTxHex)
          .outs[psbt.txInputs[0].index]
          .script,
      network,
  );

  if (sellerAddressFromPSBT !== ordinal.address) {
    res.status(500).send({
      message: 'invalid address',
    });
    console.log('invalid address 2');
    return;
  }

  ordinal.onSale = true;
  await ordinal.save();

  collection.onSaleInscriptions += 1;
  await collection.save();

  res.status(200).send({
    id: id,
    onSale: true,
    message: 'Ordinal listed successfully',
  });
};

/**
 * Generates a transaction ID from a hash.
 *
 * @param {Buffer} hash - The hash to generate the transaction ID from.
 * @return {string} The generated transaction ID.
 */
function generateTxidFromHash(hash) {
  return hash.reverse().toString('hex');
}


const toXOnly = (pubKey) => {
  if (pubKey.length === 32) {
    return pubKey;
  } else {
    return pubKey.subarray(1, 33);
  }
};
/**
 * Calculates the output value for the seller's ordinal.
 *
 * @param {number} price - The price of the ordinal.
 * @param {number} makerFeeBp - The maker's fee in basis points.
 * @param {number} prevUtxoValue -
 * The value of the previous unspent transaction output.
 * @return {number} The output value for the seller's ordinal.
 */
function getSellerOrdOutputValue(
    price,
    makerFeeBp,
    prevUtxoValue,
) {
  console.log(price, makerFeeBp, prevUtxoValue);
  return (
    price - // listing price
    Math.floor((price * makerFeeBp) / 10000) +
    // less maker fees, seller implicitly pays this fee format
    prevUtxoValue // seller should get the rest of ord utxo back
  );
}

/*
async function getUTXOS(paymentAddress) {

  const network = "main"

  const response = await axios.get(
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${paymentAddress}?includeScript=true&unspentOnly=true`
  );


  let res = response.data;

  return res;

}
*/


const utxoContainInscription = async (utxo) => {
  if (utxo.status.confirmed) {
    try {
      return ((await inscriptionExist(utxo.txid + 'i0')) !== false);
    } catch (e) {
      return true; // if error the uxto may contain an inscription
    }
  }


  const tx = await getRawTransactionVerbose(utxo.txid);

  // if not confirmed, look for the inpput script for the inscription
  let foundInscription = false;

  for (const input of tx.vin) {
    if (await getRawTransactionVerbose(input.txid).confirmations === 0) {
      return true;
    }

    // const previousOutput = `${input.txid}:${input.vout}`;

    try {
      // if (getTokenByOutput(previousOutput) !== null) {
      if (await inscriptionExist(input.txid + 'i0') !== false) {
        foundInscription = true;

        return foundInscription;
      }
    } catch (e) {
      return true; // if error the uxto may contain an inscription
    }
  }

  return foundInscription;
};

/**
 * Gets the seller's input and output for a transaction.
 *
 * @param {Object} ordinal - The ordinal involved in the transaction.
 * @param {string} tapInternalKey - The taproot internal key.
 * @return {Promise<Object>}
 * A promise that resolves with an object
 * containing the seller's input and output.
 */
async function getSellerInputAndOutput(ordinal, tapInternalKey) {
  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const [ordinalUtxoTxId, ordinalUtxoVout] = ordinal.output.split(':');

  const psbt = await Psbt.findOne({tokenId: ordinal.id});
  const address = psbt.paymentAddress;

  const rawTxHex = await getRawTx(ordinalUtxoTxId);

  const tx = bitcoin.Transaction.fromHex(
      rawTxHex,
  );

  if (!tapInternalKey) {
    for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
      try {
        tx.setWitness(outputIndex, []);
      } catch { }
    }
  }

  const sellerInput = {
    hash: ordinalUtxoTxId,
    index: parseInt(ordinalUtxoVout),
    nonWitnessUtxo: tx.toBuffer(),
    witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
  };

  if (tapInternalKey) {
    sellerInput.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(tapInternalKey, 'hex'),
    );
  }

  const ret = {
    sellerInput,
    sellerOutput: {
      address: address,
      value: getSellerOrdOutputValue(
          parseInt(ordinal.price),
          parseInt(inscription.royalty),
          parseInt(ordinal.outputValue),
      ),
    },
  };
  return ret;
}

/**
 * Generates an unsigned buying PSBT in base64 format.
 *
 * @param {string} id - The ID of the ordinal.
 * @param {string} buyerCardinalAddress - The buyer's cardinal address.
 * @param {string} buyerOrdinalAddress - The buyer's ordinal address.
 * @param {string} buyerPublicKey - The buyer's public key.
 * @param {string} cardinalPublicKey - The cardinal's public key.
 * @param {Array} buyerDummyUTXOs - The buyer's dummy UTXOs.
 * @param {Array} buyerPaymentUTXOs - The buyer's payment UTXOs.
 * @return {Promise<string>}
 * A promise that resolves with the unsigned buying PSBT in base64 format.
 */
/*
async function generateUnsignedBuyingPSBTBase64(id,
    buyerCardinalAddress,
    buyerOrdinalAddress,
    buyerPublicKey,
    cardinalPublicKey,
    buyerDummyUTXOs,
    buyerPaymentUTXOs) {
  const ordinal = await Ordinal.findOne({id: id});

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const psbt = new bitcoin.Psbt({network});

  const _psbt = await Psbt.findOne({tokenId: id});
  const tapInternalKey = _psbt.publicKey;


  if (!buyerCardinalAddress || !buyerOrdinalAddress) {
    console.log('invalid address');
    throw new Error('invalid address');
  }

  if (buyerDummyUTXOs.length !== 2 || !buyerPaymentUTXOs) {
    console.log('buyer not enough utxos');
    throw new Error('buyer not enough utxos');
  }

  let totalInput = 0;

  for (const dummyUtxoP of buyerDummyUTXOs) {
    const dummyUtxo = await dummyUtxoP;
    const input = {
      hash: dummyUtxo.txid,
      index: dummyUtxo.vout,
      nonWitnessUtxo: dummyUtxo.tx.toBuffer(),
      // witnessUtxo: dummyUtxo.tx.outs[dummyUtxo.vout]
    };

    const p2shInputRedeemScript = {};
    const p2shInputWitnessUtxo = {};

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      const redeemScript = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(cardinalPublicKey, 'hex'),
      }).output;
      const p2sh = bitcoin.payments.p2sh({
        redeem: {output: redeemScript},
      });
      p2shInputWitnessUtxo.witnessUtxo = {
        script: p2sh.output,
        value: dummyUtxo.value,
      };
      p2shInputRedeemScript.redeemScript = p2sh.redeem?.output;
    }

    if (isTaprootAddress(buyerCardinalAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
      });
      p2shInputWitnessUtxo.witnessUtxo = {
        script: taproot.output,
        value: dummyUtxo.value,
      };

      input.tapInternalKey = toXOnly(
          Buffer.from(cardinalPublicKey, 'hex'),
      );
    }

    psbt.addInput({
      ...input,
      ...p2shInputWitnessUtxo,
      ...p2shInputRedeemScript,
    });
    totalInput += dummyUtxo.value;
  }

  psbt.addOutput({
    address: buyerCardinalAddress,
    value:
      (await buyerDummyUTXOs[0]).value +
      (await buyerDummyUTXOs[1]).value +
      Number(ordinal.location.split(':')[2]),
  });

  // add ordinal output

  psbt.addOutput({
    address: buyerOrdinalAddress,
    value: 10000,
  });

  const {sellerInput, sellerOutput} =
  await getSellerInputAndOutput(ordinal, tapInternalKey);

  psbt.addInput(sellerInput);
  psbt.addOutput(sellerOutput);

  // add payment utxo inputs

  for (const utxo of buyerPaymentUTXOs) {
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${utxo.txid}?format=hex`,
    );

    const rawTxHex = resp.data;

    // const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(rawTxHex, 'hex'),
      // witnessUtxo: tx.outs[utxo.vout]
    };

    const p2shInputWitnessUTXOUn = {};
    const p2shInputRedeemScriptUn = {};

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      const redeemScript = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(cardinalPublicKey, 'hex'),
      }).output;
      const p2sh = bitcoin.payments.p2sh({
        redeem: {output: redeemScript},
      });

      p2shInputWitnessUTXOUn.witnessUtxo = {
        script: p2sh.output,
        value: utxo.value,
      };
      p2shInputRedeemScriptUn.redeemScript = p2sh.redeem?.output;
    }

    // check if it's taproot address and add taproot input

    if (isTaprootAddress(buyerCardinalAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
      });
      p2shInputWitnessUTXOUn.witnessUtxo = {
        script: taproot.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(
          Buffer.from(cardinalPublicKey, 'hex'),
      );
    }

    psbt.addInput({
      ...input,
      ...p2shInputWitnessUTXOUn,
      ...p2shInputRedeemScriptUn,
    });

    totalInput += utxo.value;
  }

  // platform fee output

  let platformFeeValue = Math.floor(
      (parseInt(ordinal.price) *
      (parseInt(inscription.royalty) + parseInt(PLATFORM_FEES))) /
    10000,
  );

  platformFeeValue = platformFeeValue > 580 ? platformFeeValue : 0;

  if (platformFeeValue > 0) {
    psbt.addOutput({
      address: PLATFORM_FEE_ADDRESS,
      value: platformFeeValue,
    });
  }

  // dummy output for next purchase
  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });

  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });

  const fee = await calculateTxBytesFee(
      psbt.txInputs.length,
      psbt.txOutputs.length,
  );

  const totalOutput = psbt.txOutputs.reduce(
      (partialSum, a) => partialSum + a.value,
      0,
  );
  const changeValue = totalInput - totalOutput - fee;

  if (changeValue < 0) {
    console.log('not enough funds');
    throw new Error('not enough funds');
  }

  if (changeValue > 580) {
    psbt.addOutput({
      address: buyerCardinalAddress,
      value: changeValue,
    });
  }

  const unsignedBuyingPSBTBase64 = psbt.toBase64();
  const unsignedBuyingPSBTBase64InputSize = psbt.data.inputs.length;


  return {
    unsignedBuyingPSBTBase64,
    unsignedBuyingPSBTBase64InputSize,
  };
}
*/

/**
 * Generates an unsigned buying PSBT in base64 format.
 *
 * @param {string} id - The ID of the ordinal.
 * @param {string} buyerCardinalAddress - The buyer's cardinal address.
 * @param {string} buyerOrdinalAddress - The buyer's ordinal address.
 * @param {string} buyerPublicKey - The buyer's public key.
 * @param {string} cardinalPublicKey - The cardinal's public key.
 * @param {Array} buyerDummyUTXOs - The buyer's dummy UTXOs.
 * @param {Array} buyerPaymentUTXOs - The buyer's payment UTXOs.
 * @return {Promise<string>}
 * A promise that resolves with the unsigned buying PSBT in base64 format.
 */
async function generateUnsignedBuyingPSBTBase64(id,
    buyerCardinalAddress,
    buyerOrdinalAddress,
    buyerPublicKey,
    cardinalPublicKey,
    buyerDummyUTXOs,
    buyerPaymentUTXOs) {
  const ordinal = await Ordinal.findOne({id: id});

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const psbt = new bitcoin.Psbt({network});
  const _psbt = await Psbt.findOne({tokenId: id});

  const tapInternalKey = _psbt.publicKey;


  if (!buyerCardinalAddress || !buyerOrdinalAddress) {
    console.log('invalid address');
    throw new Error('invalid address');
  }


  if (buyerDummyUTXOs.length !== 2 || !buyerPaymentUTXOs) {
    console.log('buyer not enough utxos');
    throw new Error('buyer not enough utxos');
  }

  let totalInput = 0;

  for (const dummyUtxoP of buyerDummyUTXOs) {
    const dummyUtxo = await dummyUtxoP;

    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${dummyUtxo.txid}?format=hex`,
    );

    const rawTxHex = resp.data;
    */

    const rawTxHex = await getRawTx(dummyUtxo.txid);

    const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const isSegwit = rawTxHex.substring(8, 12) === '0001';

    const input = {
      hash: dummyUtxo.txid,
      index: dummyUtxo.vout,
    // nonWitnessUtxo: dummyUtxo.tx.toBuffer(),
    // witnessUtxo: dummyUtxo.tx.outs[dummyUtxo.vout]
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[dummyUtxo.vout]);
    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};

    const p2wpkh = bitcoin.payments.p2wpkh(
        {
          pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    const p2pkh = bitcoin.payments.p2pkh(
        {pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    let p2sh;
    if (isP2SHAddress(buyerCardinalAddress, network)) {
      // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2wpkh.output, network: network},
      });
    } else {
      // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2pkh.output, network: network},
      });
    }

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }

    if (isP2WSHAddress(buyerCardinalAddress, network)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    // check if address is taproot
    if (isTaprootAddress(buyerCardinalAddress)) {
      const p2ktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
        network: network,
      });

      mixin.witnessUtxo = {
        script: p2ktr.output,
        value: dummyUtxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(cardinalPublicKey, 'hex'));
    }


    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
    });
    totalInput += dummyUtxo.value;
  }

  psbt.addOutput({
    address: buyerCardinalAddress,
    value:
    (await buyerDummyUTXOs[0]).value +
    (await buyerDummyUTXOs[1]).value +
    Number(ordinal.location.split(':')[2]),
  });

  // add ordinal output

  psbt.addOutput({
    address: buyerOrdinalAddress,
    value: 10000,
  });

  const {sellerInput, sellerOutput} =
await getSellerInputAndOutput(ordinal, tapInternalKey);

  psbt.addInput(sellerInput);
  psbt.addOutput(sellerOutput);

  // add payment utxo inputs

  for (const utxo of buyerPaymentUTXOs) {
    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${utxo.txid}?format=hex`,
    );

    const rawTxHex = resp.data;
    */

    const rawTxHex = await getRawTx(utxo.txid);

    const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const isSegwit = rawTxHex.substring(8, 12) === '0001';

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
    // nonWitnessUtxo: Buffer.from(rawTxHex, 'hex'),
    // witnessUtxo: tx.outs[utxo.vout]
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[utxo.vout]);
    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};

    const p2wpkh = bitcoin.payments.p2wpkh(
        {
          pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    const p2pkh = bitcoin.payments.p2pkh(
        {pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    let p2sh;
    if (isP2SHAddress(buyerCardinalAddress, network)) {
    // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2wpkh.output, network: network},
      });
    } else {
    // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2pkh.output, network: network},
      });
    }

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }

    if (isP2WSHAddress(buyerCardinalAddress, network)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    // check if address is taproot
    if (isTaprootAddress(buyerCardinalAddress)) {
      const p2ktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
        network: network,
      });

      mixin.witnessUtxo = {
        script: p2ktr.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(cardinalPublicKey, 'hex'));
    }

    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
    });

    totalInput += utxo.value;
  }

  // platform fee output

  let platformFeeValue = Math.floor(
      (parseInt(ordinal.price) *
    (parseInt(inscription.royalty) + parseInt(PLATFORM_FEES))) /
  10000,
  );

  platformFeeValue = platformFeeValue > 580 ? platformFeeValue : 0;

  if (platformFeeValue > 0) {
    psbt.addOutput({
      address: PLATFORM_FEE_ADDRESS,
      value: platformFeeValue,
    });
  }

  // dummy output for next purchase
  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });

  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });

  const fee = await calculateTxBytesFee(
      psbt.txInputs.length,
      psbt.txOutputs.length,
  );

  const totalOutput = psbt.txOutputs.reduce(
      (partialSum, a) => partialSum + a.value,
      0,
  );
  const changeValue = totalInput - totalOutput - fee;

  if (changeValue < 0) {
    console.log('not enough funds', changeValue);
    throw new Error('not enough funds');
  }

  if (changeValue > 580) {
    psbt.addOutput({
      address: buyerCardinalAddress,
      value: changeValue,
    });
  }

  const unsignedBuyingPSBTBase64 = psbt.toBase64();
  const unsignedBuyingPSBTBase64InputSize = psbt.data.inputs.length;


  return {
    unsignedBuyingPSBTBase64,
    unsignedBuyingPSBTBase64InputSize,
  };
}

/**
 * Merges a signed listing PSBT in base64 format
 * with a signed buying PSBT in base64 format.
 *
 * @param {string} signedListingPsbtBase64 -
 * The signed listing PSBT in base64 format.
 * @param {string} signedBuyingPsbtBase64 -
 * The signed buying PSBT in base64 format.
 * @return {bitcoin.Psbt} The merged PSBT.
 */
function mergeSignedBuyingPsbtBase64(signedListingPsbtBase64,
    signedBuyingPsbtBase64) {
  const sellerSignedPsbt = bitcoin.Psbt.fromBase64(signedListingPsbtBase64);
  const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPsbtBase64);

  buyerSignedPsbt.data.globalMap.unsignedTx.tx.ins[2] =
    sellerSignedPsbt.data.globalMap.unsignedTx.tx.ins[0];
  buyerSignedPsbt.data.inputs[2] =
    sellerSignedPsbt.data.inputs[0];

  /*
   buyerSignedPsbt.data.globalMap.unsignedTx.tx.ins[
     2
   ] = sellerSignedPsbt.data.globalMap.unsignedTx.tx.ins[0];
   buyerSignedPsbt.data.inputs[2] =
     sellerSignedPsbt.data.inputs[0];
     */


  return buyerSignedPsbt.toBase64();
}

/**
 * Verifies the value of a dummy UTXO.
 *
 * @param {bitcoin.Psbt} psbt - The PSBT that contains the dummy UTXO.
 * @param {number} index - The index of the dummy UTXO in the PSBT.
 * @return {number} The value of the dummy UTXO.
 */
function verifyDummyUtxoGetValue(psbt, index) {
  const dummyUtxoInput = psbt.data.inputs[index];

  if (dummyUtxoInput.witnessUtxo) {
    return dummyUtxoInput.witnessUtxo.value;
  } else if (dummyUtxoInput.nonWitnessUtxo) {
    const dummyUtxo = bitcoin.Transaction.fromBuffer(
        dummyUtxoInput.nonWitnessUtxo,
    );
    const dummyOutIndex = psbt.txInputs[index].index;
    return dummyUtxo.outs[dummyOutIndex].value;
  } else {
    console.log('Empty nonWitnessUtxo or witnessUtxo');
  }
}

/**
 * Verifies a signed buying PSBT in base64 format.
 *
 * @param {string} id - The ID of the ordinal.
 * @param {string} signedBuyingPsbtBase64 -
 * The signed buying PSBT in base64 format.
 * @param {string} buyerCardinalAddress - The buyer's cardinal address.
 * @param {string} buyerOrdinalAddress - The buyer's ordinal address.
 * @return {Promise} A promise that resolves when the verification is complete.
 */
async function verifySignedBuyingPsbtBase64(id,
    signedBuyingPsbtBase64,
    buyerCardinalAddress,
    buyerOrdinalAddress) {
  const ordinal = await Ordinal.findOne({id: id});

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const _psbt = await Psbt.findOne({tokenId: id});

  const psbt = bitcoin.Psbt.fromBase64(signedBuyingPsbtBase64,
      {network});

  // psbt.validateSignaturesOfInput(validator)

  const buyerTokenReceiveAddress = psbt.txOutputs[1].address;

  if (buyerTokenReceiveAddress !== buyerOrdinalAddress) {
    console.log('invalid ordinal address receiver');
    throw new Error('invalid ordinal address receiver');
  }

  const ordCurrentOutput = generateTxidFromHash(
      psbt.txInputs[2].hash) + ':' + psbt.txInputs[2].index;

  const ordItemFromSignedBuyingPsbt = await getTokenByOutput(ordCurrentOutput);

  const ordItemFromReq = await getTokenById(id);

  if (!ordItemFromSignedBuyingPsbt || !ordItemFromReq) {
    console.log('ordinal not found');
    throw new Error('ordinal not found');
  }

  if (ordItemFromReq.location !== ordItemFromSignedBuyingPsbt.location) {
    console.log('invalid location');
    throw new Error('invalid location');
  }

  const priceSetByBuyerPsbt = psbt.txOutputs[2].value;
  if (!ordItemFromReq.price) {
    console.log('price not set');
    throw new Error('price not set');
  }
  /*
    if (ordItemFromReq.royalty === undefined) {

      console.log("royalty not set");
      return false;
    }
    */

  const expectedSellerReceiveValue = getSellerOrdOutputValue(
      parseInt(ordItemFromReq.price),
      parseInt(inscription.royalty),
      parseInt(ordItemFromReq.outputValue),
  );
  if (priceSetByBuyerPsbt !== expectedSellerReceiveValue) {
    console.log('invalid price');
    throw new Error('invalid price');
  }

  const sellerReceiveAddress = psbt.txOutputs[2].address;

  if (sellerReceiveAddress !== _psbt.paymentAddress) {
    console.log('invalid seller address');
    throw new Error('invalid seller address');
  }

  if (psbt.txOutputs[1].value !== 10000) {
    console.log('invalid value');
    throw new Error('invalid value');
  }

  if (psbt.txOutputs[1].address !== buyerOrdinalAddress) {
    console.log('invalid address 3');
    throw new Error('invalid buyer Ordinal address');
  }

  const platformFeeValueExpected = Math.floor(
      (parseInt(ordItemFromReq.price) *
      (parseInt(inscription.royalty) + parseInt(PLATFORM_FEES))) /
    10000,
  );

  if (platformFeeValueExpected > 580) {
    const platformFeeValue = psbt.txOutputs[3].value;
    if (platformFeeValue !== platformFeeValueExpected) {
      console.log('invalid platform fee');
      throw new Error('invalid platform fee');
    }
    if (psbt.txOutputs[3].address !== PLATFORM_FEE_ADDRESS) {
      console.log('invalid platform address');
      throw new Error('invalid platform address');
    }
  }


  return true;
}

/**
 * Generates an unsigned PSBT for creating a dummy UTXO in base64 format.
 *
 * @param {string} buyerAddress - The buyer's address.
 * @param {string} cardinalAddress - The cardinal's address.
 * @param {string} publicKey - The public key.
 * @param {Array} unqualifiedUtxos - The unqualified UTXOs.
 * @return {Promise<string>}
 * A promise that resolves with the unsigned PSBT in base64 format.
 */
async function generateUnsignedCreateDummyUtxoPSBTBase64(buyerAddress,
    cardinalAddress,
    publicKey,
    unqualifiedUtxos) {
  const psbt = new bitcoin.Psbt({network});
  const [mappedUnqualifiedUtxos, recommendedFee] =
    await Promise.all([
      mapUtxos(unqualifiedUtxos),
      getFees(),
    ]);

  let totalValue = 0;
  let paymentUtxoCount = 0;

  for (const utxo of mappedUnqualifiedUtxos) {
    if (await utxoContainInscription(utxo)) {
      continue;
    }

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: utxo.tx.toBuffer(),
      // witnessUtxo: utxo.tx.outs[utxo.vout] // ----> ?
    };

    if (isP2SHAddress(cardinalAddress, network)) {
      const redeemScript = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(publicKey, 'hex'),
      }).output;
      const p2sh = bitcoin.payments.p2sh({
        redeem: {output: redeemScript},
      });
      input.witnessUtxo = utxo.tx.outs[utxo.vout];
      input.redeemScript = p2sh.redeem?.output;
    }

    if (isTaprootAddress(cardinalAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(publicKey, 'hex')),
      });
      input.witnessUtxo = {
        script: taproot.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(
          Buffer.from(publicKey, 'hex'),
      );
    }

    psbt.addInput(input);
    totalValue += utxo.value;
    paymentUtxoCount += 1;

    const fees = calculateTxBytesFeeWithRate(
        paymentUtxoCount,
        2,
        recommendedFee,
    );
    if (totalValue >= 600 * 2 + fees) {
      break;
    }
  }

  const finalFees = calculateTxBytesFeeWithRate(
      paymentUtxoCount,
      2,
      recommendedFee,
  );

  const changeValue = totalValue - 600 * 2 - finalFees;
  console.log(finalFees);
  if (changeValue < 0) {
    console.log('not enough funds');
    throw new Error('not enough funds');
  }

  psbt.addOutput({
    address: cardinalAddress,
    value: 600,
  });

  psbt.addOutput({
    address: cardinalAddress,
    value: 600,
  });

  // if (changeValue > 580) {
  psbt.addOutput({
    address: cardinalAddress,
    value: changeValue,
  });
  // }

  return psbt.toBase64();
}

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
 * Checks if a given address is a Taproot address.
 *
 * @param {string} address - The address to check.
 * @return {boolean} True if the address is a Taproot address, false otherwise.
 */
function isTaprootAddress(address) {
  try {
    const parsedAddress = bitcoin.address.fromBech32(address);
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

/**
 * Gets the raw transaction for a given transaction ID.
 *
 * @param {string} txid - The transaction ID.
 * @return {Promise<string>} A promise that resolves with the raw transaction.
 */
/*
async function getRawTransaction(txid) {
  // const _txid = generateTxidFromHash(Buffer.from(txid, 'hex'));

  const resp = await axios.get(
      `https://blockchain.info/rawtx/${txid}?format=hex`,
  );

  const rawTxHex = resp.data;

  return rawTxHex;
}
*/

/**
 * Gets a token by its output.
 *
 * @param {string} output - The output of the token.
 * @return {Promise<Object>} A promise that resolves with the token.
 */
async function getTokenByOutput(output) {
  const ordinal = await Ordinal.findOne({output: output});

  return ordinal;
}

/**
 * Gets a token by its ID.
 *
 * @param {string} id - The ID of the token.
 * @return {Promise<Object>} A promise that resolves with the token.
 */
async function getTokenById(id) {
  const ordinal = await Ordinal.findOne({id: id});

  return ordinal;
}

/**
 * Gets the raw transaction for a given transaction ID in verbose mode.
 *
 * @param {string} txid - The transaction ID.
 * @return {Promise<Object>} A promise that resolves with the raw transaction.
 */
async function getRawTransactionVerbose(txid) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const data = {
    method: 'getrawtransaction',
    params: [
      txid,
      2,
    ],
  };

  const resp = await axios.post('https://warmhearted-damp-sheet.btc.discover.quiknode.pro/6441d797cd3307532f35e75c0fc9703dc9d8591b/', data, config);


  return resp.data.result;
}

/* ------------------ */

/**
 * Selects dummy UTXOs from a list of UTXOs that do not contain a given ordinal.
 *
 * @param {Array} utxos - The list of UTXOs to select from.
 * @param {Object} ordinal -
 * The ordinal that the selected UTXOs should not contain.
 * @return {Promise<Array>}
 * A promise that resolves with the selected dummy UTXOs.
 */
async function selectDummyUTXOs(utxos, ordinal) {
  const result = [];

  for (const utxo of utxos) {
    console.log(utxo.txid, await utxoContainInscription(utxo));
    if (await utxoContainInscription(utxo, ordinal)) {
      continue; ;
    }

    if (
      utxo.value >= 580 &&
      utxo.value <= 1000
    ) {
      result.push((await mapUtxos([utxo]))[0]);
      if (result.length === 2) return result;
    }
  }
  return null;
}

/**
 * Maps a list of UTXOs from the mempool to a new format.
 *
 * @param {Array} utxosFromMempool - The list of UTXOs from the mempool.
 * @return {Promise<Array>} A promise that resolves with the mapped UTXOs.
 */
/*
async function mapUtxos(utxosFromMempool) {
  const ret = [];
  for (const utxoFromMempool of utxosFromMempool) {
    // const txid = generateTxidFromHash(
    // Buffer.from(utxoFromMempool.txid, 'hex'));

    const vout = utxoFromMempool.vout;
    const value = utxoFromMempool.value;

    const rawTransaction = await getRawTransaction(utxoFromMempool.txid);
    const tx = bitcoin.Transaction.fromHex(rawTransaction);

    ret.push({
      txid: utxoFromMempool.txid,
      vout: vout,
      value: value,
      tx: tx,
      status: utxoFromMempool.status,
    });
  }
  return ret;
}
*/
/**
 * Maps a list of UTXOs from the mempool to a new format.
 *
 * @param {Array} utxosFromMempool - The list of UTXOs from the mempool.
 * @return {Promise<Array>} A promise that resolves with the mapped UTXOs.
 */
async function mapUtxos(utxosFromMempool) {
  return utxosFromMempool.map(async (utxoFromMempool) => {
    const vout = utxoFromMempool.vout;
    const value = utxoFromMempool.value;

    const rawTransaction = await getRawTx(utxoFromMempool.txid);
    const tx = bitcoin.Transaction.fromHex(rawTransaction);
    return {
      txid: utxoFromMempool.txid,
      vout: vout,
      value: value,
      tx: tx,
      status: utxoFromMempool.status,
    };
  });
}

/**
 * Selects payment UTXOs from a list of UTXOs
 * that do not contain a given ordinal and have a value greater than 600.
 *
 * @param {Array} utxos - The list of UTXOs to select from.
 * @param {number} amount - The amount that the selected UTXOs should sum to.
 * @param {number} vinsLength - The length of the vins array.
 * @param {number} voutsLength - The length of the vouts array.
 * @param {Object} ordinal -
 * The ordinal that the selected UTXOs should not contain.
 * @return {Promise<Array>}
 * A promise that resolves with the selected payment UTXOs.
 */
async function selectPaymentUtxos(utxos,
    amount,
    vinsLength,
    voutsLength,
    ordinal) {
  const selectedUtxos = [];
  let selectedAmount = 0;

  utxos = utxos.filter((x) => x.value > 600)
      .sort((a, b) => b.value - a.value);

  for (const utxo of utxos) {
    if (await utxoContainInscription(utxo, ordinal)) {
      continue;
    }

    selectedUtxos.push(utxo);
    selectedAmount += utxo.value;

    if (selectedAmount >=
      amount +
      (await calculateTxBytesFee(
          vinsLength + selectedUtxos.length,
          voutsLength,

      ))
    ) {
      break;
    }
  }

  if (selectedAmount < amount) {
    console.log('not enough cardinal spendable funds');
    throw new Error('not enough cardinal spendable funds');
  }

  return selectedUtxos;
}

/**
 * Calculates the transaction bytes fee.
 *
 * @param {number} vinsLength - The length of the vins array.
 * @param {number} voutsLength - The length of the vouts array.
 * @param {boolean} [includeChangeOutput=1] -
 * Whether to include the change output in the calculation.
 * @return {Promise<number>}
 * A promise that resolves with the calculated fee.
 */
async function calculateTxBytesFee(
    vinsLength,
    voutsLength,
    includeChangeOutput = 1,
) {
  const recommendedFeeRate = await getFees();
  return calculateTxBytesFeeWithRate(
      vinsLength,
      voutsLength,
      recommendedFeeRate,
      includeChangeOutput,
  );
}


/**
 * Fetches the recommended transaction fees from mempool.space API.
 *
 * @return {Promise<number>} A promise that resolves with the fastest fee.
 */
async function getFees() {
  const rs = await axios.get(
      `${MEMPOOL}v1/fees/recommended`,
  );

  const fee = rs.data.halfHourFee; // hourFee halfHourFee fastestFee

  return fee;
}

exports.getFees = async (req, res) => {
  const inputCount = parseInt(req.query.input);
  const outputCount = parseInt(req.query.output);
  const feeRate = parseInt(req.query.feeRate);

  /*
  const rs = await getFees();

  const transactionSize = inputCount * 180 + outputCount * 34 + 10 - inputCount;
  */
  const fee = await txFeeByRate(inputCount, outputCount, feeRate);
  // const fee = await calculateTxBytesFee(inputCount, outputCount);

  res.status(200).send({
    fee: fee,
  });
};

exports.getFeesRate = async (req, res) => {
  const inputCount = parseInt(req.query.input);
  const outputCount = parseInt(req.query.output);

  const fee = await calculateTxBytesFee(inputCount, outputCount);

  res.status(200).send({
    fee: fee,
  });
};

const txFeeByRate = async (inputCount, outputCount, feeRate) => {
  const transactionSize = inputCount * 180 + outputCount * 34 + 10 - inputCount;

  const fee = Math.ceil(feeRate * transactionSize); // 1024

  return fee;
};

/**
 * Calculates the transaction bytes fee with a given fee rate.
 *
 * @param {number} vinsLength - The length of the vins array.
 * @param {number} voutsLength - The length of the vouts array.
 * @param {number} feeRate - The fee rate to use in the calculation.
 * @param {boolean} [includeChangeOutput=1] -
 * Whether to include the change output in the calculation.
 * @return {number}
 * The calculated fee.
 */
function calculateTxBytesFeeWithRate(
    vinsLength,
    voutsLength,
    feeRate,
    includeChangeOutput = 1,
) {
  const baseTxSize = 10;
  const inSize = 180;
  const outSize = 34;

  const txSize =
    baseTxSize +
    vinsLength * inSize +
    voutsLength * outSize +
    includeChangeOutput * outSize;
  const fee = txSize * feeRate;
  return fee;
}

/**
 * Fetches the unspent transaction outputs (UTXOs) for a given address.
 *
 * @param {string} address - The address to fetch the UTXOs for.
 * @return {Promise<Array>} A promise that resolves with the UTXOs.
 */
async function getUTXOS(address) {
  const response = await axios.get(
      `${MEMPOOL}address/${address}/utxo`,
  );


  return response.data;
}

/**
 * Checks if an inscription exists for a given transaction ID.
 *
 * @param {string} txid - The transaction ID.
 * @return {Promise<boolean>}
 * A promise that resolves with a boolean
 * indicating whether the inscription exists.
 * add headers
 */
async function inscriptionExist(txid) {
  try {
    await axios.get(
        `${ORDINAL_API}${txid}`,
        null,
        {
          headers: {
            'x-hiro-api-key': HIRO_API_KEY,
          },
        },
    );

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches the transaction data for a given transaction ID.
 *
 * @param {string} txId - The transaction ID.
 * @return {Promise<Object|null>}
 * A promise that resolves with the transaction data,
 * or null if an error occurred.
 */
async function getTransactionsByTxId(txId) {
  try {
    const response = await axios.get(
        `${MEMPOOL}tx/${txId}`,
    );

    return response.data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Checks if there are at least 2 dummy UTXOs in a list of UTXOs.
 * A dummy UTXO is defined as a UTXO with a value between 580 and 1000.
 *
 * @param {Array} utxos - The list of UTXOs to check.
 * @return {Promise<boolean>}
 * A promise that resolves with a boolean indicating
 * whether there are at least 2 dummy UTXOs.
 */
async function has2DummyUtxos(utxos) {
  let count = 0;

  for (const utxo of utxos) {
    if (utxo.value >= 580 && utxo.value <= 1000) {
      count++;
    }
  }

  return count >= 2;
}

exports.hasDummyUtxos = async (req, res) => {
  const cardinalAddress = req.params.address;
  const id = req.query.id;
  const action = req.query.action;

  const user = await User.findOne({cardinalAddress: cardinalAddress});

  const utxos = await getUTXOS(cardinalAddress);

  const valid = await has2DummyUtxos(utxos);

  const ordinal = await Ordinal.findOne({id: id});

  if (action === 'buy') {
    const buying = await new Buying({
      ordinalId: id,
      dummyConfirmed: valid,
      amount: parseInt(ordinal.price),
      user: user._id,
    });

    await buying.save();

    res.status(200).send({
      valid: valid,
      buyingId: buying._id,
    });
  } else if (action === 'bid') {
    const bid = await new Bid({
      tokenId: id,
      dummyConfirmed: valid,
      amount: parseInt(ordinal.price),
      bidderOrdinalAddress: user.ordinalAddress,
    });

    await bid.save();

    res.status(200).send({
      valid: valid,
      bidId: bid._id,
    });
  }
};

exports.sendUTXOS = async (req, res) => {
  const cardinalAddress = req.params.address;
  const buyingId = req.body.buyingId;
  let txHash;
  try {
    txHash = await walletController.autoUTXOS(cardinalAddress);

    res.status(200).send({
      txHash: txHash,
    });
  } catch (e) {
    res.status(500).send({
      message: e.message,
    });
  }

  if (!txHash) {
    return;
  }

  await delay(2000);

  dummyStatus(txHash, buyingId);
};

exports.generateUnsignedDummyUtxoPsbt = async (req, res) => {
  const buyerAddress = req.body.ordinalAddress;
  const cardinalAddress = req.body.cardinalAddress;
  const publicKey = req.body.publicKey;

  const unqualifiedUtxos = await getUTXOS(cardinalAddress);
  // const unqualifiedUtxos = await getUnspent(buyerAddress);
  try {
    const dummyPsbt =
    await generateUnsignedCreateDummyUtxoPSBTBase64(buyerAddress,
        cardinalAddress,
        publicKey,
        unqualifiedUtxos);

    if (!dummyPsbt) {
      // send error message
      return res.status(500).send({
        message: 'not enough funds',
      });
    }
    res.status(200).send({
      buyerAddress: cardinalAddress,
      dummyPsbt: dummyPsbt,
      utxos: unqualifiedUtxos,
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).send({
      message: e.message,
    });
  }
};

exports.verifyDummyUtxoPsbt = async (req, res) => {
  const psbtHex = req.body.signedDummyPsbt;
  const buyingId = req.body.buyingId;

  const psbtBase64 = Buffer.from(psbtHex, 'hex').toString('base64');

  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
    network,
  });

  const value = verifyDummyUtxoGetValue(psbt, 0);

  if (value < 580) {
    return res.status(500).send({
      valid: false,
      message: 'invalid value',
    });
    console.log('invalid value');
  }
  /*
  res.status(200).send({
    message: "success validating dummy psbt",
  });
  */
  psbt.finalizeAllInputs();

  let broadcastedTx;

  try {
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    // const txId = tx.getId();

    broadcastedTx = await broadcastTransaction(txHex);
  } catch (e) {
    console.log(e.message);
    return res.status(500).send({
      message: e.message,
    });
  }

  if (!broadcastedTx) {
    console.log('broadcastedTx is null');
    return;
  }

  // try to get buying object with buyingId if it fails,
  // try to get Bid object with buyingId

  try {
    const buying = await Buying.findById(buyingId);
    buying.dummyTxHash = broadcastedTx;
    await buying.save();
  } catch (e) {
    const bid = await Bid.findById(buyingId);
    bid.dummyTxHash = broadcastedTx;
    await bid.save();
  }

  res.status(200).send({
    valid: true,
    tx: broadcastedTx,
  });

  await delay(2000);

  dummyStatus(broadcastedTx, buyingId);
};


exports.createNewBuyTransaction = async (req, res) => {
  const id = req.body.id;

  const ordinal = await Ordinal.findOne({id: id});

  const price = parseInt(ordinal.price);

  const buyerCardinalAddress = req.body.cardinalAddress;
  const buyerOrdinalAddress = req.body.ordinalAddress;
  const ordinalPublicKey = req.body.ordinalPublicKey;
  const cardinalPublicKey = req.body.cardinalPublicKey;
  const buyingId = req.body.buyingId;

  // const utxos = getUnspent(buyerCardinalAddress);

  const _utxos = await getUTXOS(buyerCardinalAddress);

  // get the buyer dummy utxos
  const dummyUtxos = await selectDummyUTXOs(_utxos, ordinal);

  // get the buyer payment utxos
  /*
  selectPaymentUtxos(_utxos, price, 2, 2, ordinal).then(
      (paymentUtxos) => generateUnsignedBuyingPSBTBase64(id,
          buyerCardinalAddress,
          buyerOrdinalAddress,
          ordinalPublicKey,
          cardinalPublicKey,
          dummyUtxos,
          paymentUtxos).then((unsignedBuyingPSBTBase64) => {
        res.status(200).send({
          id: id,
          buyerCardinalAddress,
          buyerOrdinalAddress,
          unsignedBuyingPSBTBase64,
        });
      }).catch((e) => {
        console.log(e.message);
        cancelOrdinalBuy(buyingId);
        return res.status(500).send({
          message: e.message,
        });
      }));
*/

  try {
  // get the buyer payment utxos
    const paymentUtxos = await selectPaymentUtxos(_utxos, price, 2, 2, ordinal);


    // generate the unsigned buying psbt
    const {unsignedBuyingPSBTBase64, unsignedBuyingPSBTBase64InputSize} =
      await generateUnsignedBuyingPSBTBase64(id,
          buyerCardinalAddress,
          buyerOrdinalAddress,
          ordinalPublicKey,
          cardinalPublicKey,
          dummyUtxos,
          paymentUtxos);

    res.status(200).send({
      id: id,
      inputSize: unsignedBuyingPSBTBase64InputSize,
      buyerCardinalAddress,
      buyerOrdinalAddress,
      unsignedBuyingPSBTBase64,
    });
  } catch (e) {
    console.log(e.message);
    cancelOrdinalBuy(buyingId);
    return res.status(500).send({
      message: e.message,
    });
  }
};

exports.verifyBuyTransaction = async (req, res) => {
  const id = req.body.id;
  const buyingId = req.body.buyingId;

  const signedBuyingPsbtBase64 = req.body.signedBuyingPsbtBase64;
  const publicKey = req.body.publicKey;

  const psbt = await Psbt.findOne({tokenId: id});

  psbt.signedBuyingPSBTBase64 = signedBuyingPsbtBase64;

  await psbt.save();

  const ordinal = await Ordinal.findOne({id: id});

  const buyerCardinalAddress = req.body.cardinalAddress;
  const buyerOrdinalAddress = req.body.ordinalAddress;

  try {
    const isValid =
      await verifySignedBuyingPsbtBase64(id,
          signedBuyingPsbtBase64,
          buyerCardinalAddress,
          buyerOrdinalAddress);

    if (!isValid) {
      res.status(500).send({
        message: 'invalid psbt',
      });
      console.log('invalid psbt');
      return;
    }
  } catch (e) {
    console.log(e.message);
    cancelOrdinalBuy(buyingId);
    return res.status(500).send({
      message: e.message,
    });
  }

  let broadcastedTx;

  try {
    const mergedPsbt = await mergeBuyTransaction(id);

    const finalTxHex = await finalizeBuyTransaction(mergedPsbt, publicKey);

    broadcastedTx = await broadcastTransaction(finalTxHex);

    res.status(200).send({
      tx: broadcastedTx,
    });
  } catch (e) {
    console.log(e.message);
    cancelOrdinalBuy(buyingId);
    sendMail('info@function.gallery', e, 'error');
    return res.status(500).send({
      message: e.message,
    });
  }

  if (!broadcastedTx) {
    console.log('broadcastedTx is null');
    return;
  }


  const buying = await Buying.findById(buyingId);
  buying.buyingTxHash = broadcastedTx;
  buying.amount = ordinal.price;
  buying.valid = true;
  await buying.save();

  // remove psbt
  await Psbt.deleteOne({tokenId: id});

  await delay(6000);

  // artist royalty payment
  let {address, value} =
  await getArtistPaymentInfo(ordinal.id, ordinal.price);
  value = value > 580 ? value : 0;

  if (value > 0) {
    const txIdPayment = await walletController.autoTransaction(value, address);
    console.log('artist royalty payment txId', txIdPayment);
  }

  refreshInscriptionData(id, buyingId, broadcastedTx);

  ordinal.onSale = false;
  ordinal.price = 0;
  await ordinal.save();
};

/**
 * Cancels an ordinal purchase by its ID.
 *
 * @async
 * @param {string} buyingId - The ID of the buying to cancel.
 * @throws Will throw an error if
 * the buying cannot be found or the cancellation fails.
 */
async function cancelOrdinalBuy(buyingId) {
  /*
  const buying = await Buying.findById(buyingId);
  buying.canceled = true;
  await buying.save();
  */

  // remove buying
  await Buying.deleteOne({_id: buyingId});
  console.log('buying canceled', buyingId);
}

exports.createOrdinalBiddingPsbt = async (req, res) => {
  const id = req.body.id;
  const bidId = req.body.bidId;

  const ordinal = await Ordinal.findOne({id: id});

  if (!ordinal) {
    res.status(500).send({
      message: 'ordinal not found',
    });
    console.log('ordinal not found');
    removeOrdinalBid(bidId);
    return;
  }

  const amount = req.body.amount; // listing price in satoshis

  const buyerCardinalAddress = req.body.cardinalAddress;
  const buyerOrdinalAddress = req.body.ordinalAddress;
  const ordinalPublicKey = req.body.ordinalPublicKey;
  const cardinalPublicKey = req.body.cardinalPublicKey;

  const _utxos = await getUTXOS(buyerCardinalAddress);

  // get the buyer dummy utxos
  const dummyUtxos = await selectDummyUTXOs(_utxos, ordinal);

  try {
    const paymentUtxos = await selectPaymentUtxos(_utxos,
        amount,
        2,
        2,
        ordinal);

    const unsignedBiddingPSBTBase64 =
      await generateUnsignedBiddingPSBTBase64(id,
          buyerCardinalAddress,
          buyerOrdinalAddress,
          ordinalPublicKey,
          cardinalPublicKey,
          dummyUtxos,
          paymentUtxos,
          amount);

    res.status(200).send({
      id: id,
      unsignedBiddingPSBTBase64,
    });
  } catch (e) {
    console.log(e.message);
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: e.message,
    });
  }
};

/**
 * Generates an unsigned Bidding PSBT Base64.
 *
 * @param {string} id - The ID.
 * @param {string} buyerCardinalAddress - The buyer's cardinal address.
 * @param {string} buyerOrdinalAddress - The buyer's ordinal address.
 * @param {string} buyerPublicKey - The buyer's public key.
 * @param {string} cardinalPublicKey - The cardinal's public key.
 * @param {Array} buyerDummyUTXOs - The buyer's dummy UTXOs.
 * @param {Array} buyerPaymentUTXOs - The buyer's payment UTXOs.
 * @param {number} amount - The amount.
 * @return {Promise<string|null>}
 * A promise that resolves with the unsigned Bidding
 * PSBT Base64, or null if an error occurred.
 */
/*
async function generateUnsignedBiddingPSBTBase64(id,
    buyerCardinalAddress,
    buyerOrdinalAddress,
    buyerPublicKey,
    cardinalPublicKey,
    buyerDummyUTXOs,
    buyerPaymentUTXOs,
    amount) {
  const psbt = new bitcoin.Psbt({network});

  const ordinal = await Ordinal.findOne({id: id});
  const output = ordinal.output;

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const user = await User.findOne({ordinalAddress: ordinal.address});


  if (!buyerCardinalAddress || !buyerOrdinalAddress) {
    console.log('invalid address');
    throw new Error('invalid address');
  }


  if (buyerDummyUTXOs.length !== 2 || !buyerPaymentUTXOs) {
    console.log('buyer not enough utxos');
    throw new Error('buyer not enough utxos');
  }

  let totalInput = 0;

  for (const dummyUtxoP of buyerDummyUTXOs) {
    const dummyUtxo = await dummyUtxoP;
    const input = {
      hash: dummyUtxo.txid,
      index: dummyUtxo.vout,
      nonWitnessUtxo: dummyUtxo.tx.toBuffer(),
      // witnessUtxo: dummyUtxo.tx.outs[dummyUtxo.vout]
    };

    const p2shInputRedeemScript = {};
    const p2shInputWitnessUtxo = {};

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      const redeemScript = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(cardinalPublicKey, 'hex'),
      }).output;
      const p2sh = bitcoin.payments.p2sh({
        redeem: {output: redeemScript},
      });
      p2shInputWitnessUtxo.witnessUtxo = {
        script: p2sh.output,
        value: dummyUtxo.value,
      };

      p2shInputRedeemScript.redeemScript = p2sh.redeem?.output;
    }

    if (isTaprootAddress(buyerCardinalAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
      });
      p2shInputWitnessUtxo.witnessUtxo = {
        script: taproot.output,
        value: dummyUtxo.value,
      };

      input.tapInternalKey = toXOnly(
          Buffer.from(cardinalPublicKey, 'hex'),
      );
    }

    psbt.addInput({
      ...input,
      ...p2shInputWitnessUtxo,
      ...p2shInputRedeemScript,
    });
    totalInput += dummyUtxo.value;
  }

  psbt.addOutput({
    address: buyerCardinalAddress,
    value:
      (await buyerDummyUTXOs[0]).value +
      (await buyerDummyUTXOs[1]).value +
      Number(ordinal.location.split(':')[2]),
  });

  // add ordinal output

  psbt.addOutput({
    address: buyerOrdinalAddress,
    value: 10000,
  });


  const [ordinalUtxoTxId, ordinalUtxoVout] = output.split(':');

  const rawTxHex = await getRawTransaction(ordinalUtxoTxId);

  const tx = bitcoin.Transaction.fromHex(
      rawTxHex,
  );


  // get publickey from the ordinal transaction
  // const publicKey = tx.outs[parseInt(ordinalUtxoVout)].script.toString('hex')

  const sellerTapInternalKey = user.ordinalPublicKey;


  if (!sellerTapInternalKey) {
    for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
      try {
        tx.setWitness(outputIndex, []);
      } catch { }
    }
  }

  const input = {
    hash: ordinalUtxoTxId,
    index: parseInt(ordinalUtxoVout),
    nonWitnessUtxo: tx.toBuffer(),
    witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
  };

  if (sellerTapInternalKey) {
    input.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(sellerTapInternalKey, 'hex'),
    );
  }

  psbt.addInput(input);

  const sellerOutput = getSellerOrdOutputValue(
      parseInt(amount),
      parseInt(inscription.royalty),
      parseInt(ordinal.outputValue),
  );
  console.log('sellerOutput', sellerOutput);
  psbt.addOutput({
    address: user.cardinalAddress, // seller cardinal address
    value: sellerOutput,
  });


  // add payment utxo inputs

  for (const utxo of buyerPaymentUTXOs) {
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${utxo.txid}?format=hex`,
    );

    const rawTxHex = resp.data;

    // const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(rawTxHex, 'hex'),
      // witnessUtxo: tx.outs[utxo.vout],
    };

    const p2shInputWitnessUTXOUn = {};
    const p2shInputRedeemScriptUn = {};

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      const redeemScript = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(cardinalPublicKey, 'hex'),
      }).output;
      const p2sh = bitcoin.payments.p2sh({
        redeem: {output: redeemScript},
      });

      p2shInputWitnessUTXOUn.witnessUtxo = {
        script: p2sh.output,
        value: utxo.value,
      };
      p2shInputRedeemScriptUn.redeemScript = p2sh.redeem?.output;
    }

    // check if it's taproot address and add taproot input

    if (isTaprootAddress(buyerCardinalAddress)) {
      const taproot = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
      });
      p2shInputWitnessUTXOUn.witnessUtxo = {
        script: taproot.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(
          Buffer.from(cardinalPublicKey, 'hex'),
      );
    }

    psbt.addInput({
      ...input,
      ...p2shInputWitnessUTXOUn,
      ...p2shInputRedeemScriptUn,
    });

    totalInput += utxo.value;
  }

  // platform fee output

  let platformFeeValue = Math.floor(
      (parseInt(amount) *
      (parseInt(inscription.royalty) + parseInt(PLATFORM_FEES))) /
    10000,
  );

  platformFeeValue = platformFeeValue > 580 ? platformFeeValue : 0;

  if (platformFeeValue > 0) {
    psbt.addOutput({
      address: PLATFORM_FEE_ADDRESS,
      value: platformFeeValue,
    });
  }

  // dummy output for next purchase

  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });

  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });


  const fee = await calculateTxBytesFee(
      psbt.txInputs.length,
      psbt.txOutputs.length,
  );

  const totalOutput = psbt.txOutputs.reduce(
      (partialSum, a) => partialSum + a.value,
      0,
  );
  const changeValue = totalInput - totalOutput - fee;

  if (changeValue < 0) {
    console.log('not enough funds');
    throw new Error('not enough funds');
  }

  if (changeValue > 580) {
    psbt.addOutput({
      address: buyerCardinalAddress,
      value: changeValue,
    });
  }

  const unsignedBiddingPSBTBase64 = psbt.toBase64();
  const unsignedBiddingPPSBTBase64InputSize = psbt.data.inputs.length;


  return {
    unsignedBiddingPSBTBase64,
    unsignedBiddingPPSBTBase64InputSize,
  };
}
*/

/**
 * Generates an unsigned Bidding PSBT Base64.
 *
 * @param {string} id - The ID.
 * @param {string} buyerCardinalAddress - The buyer's cardinal address.
 * @param {string} buyerOrdinalAddress - The buyer's ordinal address.
 * @param {string} buyerPublicKey - The buyer's public key.
 * @param {string} cardinalPublicKey - The cardinal's public key.
 * @param {Array} buyerDummyUTXOs - The buyer's dummy UTXOs.
 * @param {Array} buyerPaymentUTXOs - The buyer's payment UTXOs.
 * @param {number} amount - The amount.
 * @return {Promise<string|null>}
 * A promise that resolves with the unsigned Bidding
 * PSBT Base64, or null if an error occurred.
 */
async function generateUnsignedBiddingPSBTBase64(id,
    buyerCardinalAddress,
    buyerOrdinalAddress,
    buyerPublicKey,
    cardinalPublicKey,
    buyerDummyUTXOs,
    buyerPaymentUTXOs,
    amount) {
  const psbt = new bitcoin.Psbt({network});

  const ordinal = await Ordinal.findOne({id: id});
  const output = ordinal.output;

  const inscription = await Inscription.findOne({ordinal: ordinal._id});

  const user = await User.findOne({ordinalAddress: ordinal.address});

  if (!user) {
    console.log('user not found');
    throw new Error('user not found, the owner has to be registered');
  }


  if (!buyerCardinalAddress || !buyerOrdinalAddress) {
    console.log('invalid address');
    throw new Error('invalid address');
  }


  if (buyerDummyUTXOs.length !== 2 || !buyerPaymentUTXOs) {
    console.log('buyer not enough utxos');
    throw new Error('buyer not enough utxos');
  }

  let totalInput = 0;

  for (const dummyUtxoP of buyerDummyUTXOs) {
    const dummyUtxo = await dummyUtxoP;
    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${dummyUtxo.txid}?format=hex`,
    );

    const rawTxHex = resp.data;
    */
    const rawTxHex = await getRawTx(dummyUtxo.txid);

    const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const isSegwit = rawTxHex.substring(8, 12) === '0001';


    const input = {
      hash: dummyUtxo.txid,
      index: dummyUtxo.vout,
      // nonWitnessUtxo: dummyUtxo.tx.toBuffer(),
    // witnessUtxo: dummyUtxo.tx.outs[dummyUtxo.vout]
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[dummyUtxo.vout]);
    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};

    const p2wpkh = bitcoin.payments.p2wpkh(
        {
          pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    const p2pkh = bitcoin.payments.p2pkh(
        {pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    let p2sh;
    if (isP2SHAddress(buyerCardinalAddress, network)) {
    // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2wpkh.output, network: network},
      });
    } else {
    // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2pkh.output, network: network},
      });
    }

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }

    if (isP2WSHAddress(buyerCardinalAddress, network)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    // check if address is taproot
    if (isTaprootAddress(buyerCardinalAddress)) {
      const p2ktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
        network: network,
      });

      mixin.witnessUtxo = {
        script: p2ktr.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(cardinalPublicKey, 'hex'));
    }

    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
    });
    totalInput += dummyUtxo.value;
  }

  psbt.addOutput({
    address: buyerCardinalAddress,
    value:
    (await buyerDummyUTXOs[0]).value +
    (await buyerDummyUTXOs[1]).value +
    Number(ordinal.location.split(':')[2]),
  });

  // add ordinal output

  psbt.addOutput({
    address: buyerOrdinalAddress,
    value: 10000,
  });


  const [ordinalUtxoTxId, ordinalUtxoVout] = output.split(':');

  const rawTxHex = await getRawTx(ordinalUtxoTxId);

  const tx = bitcoin.Transaction.fromHex(
      rawTxHex,
  );


  // get publickey from the ordinal transaction
  // const publicKey = tx.outs[parseInt(ordinalUtxoVout)].script.toString('hex')

  const sellerTapInternalKey = user.ordinalPublicKey;


  if (!sellerTapInternalKey) {
    for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
      try {
        tx.setWitness(outputIndex, []);
      } catch { }
    }
  }

  const input = {
    hash: ordinalUtxoTxId,
    index: parseInt(ordinalUtxoVout),
    nonWitnessUtxo: tx.toBuffer(),
    witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
  };

  if (sellerTapInternalKey) {
    input.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(sellerTapInternalKey, 'hex'),
    );
  }

  psbt.addInput(input);

  const sellerOutput = getSellerOrdOutputValue(
      parseInt(amount),
      parseInt(inscription.royalty),
      parseInt(ordinal.outputValue),
  );
  console.log('sellerOutput', sellerOutput);
  psbt.addOutput({
    address: user.cardinalAddress, // seller cardinal address
    value: sellerOutput,
  });


  // add payment utxo inputs

  for (const utxo of buyerPaymentUTXOs) {
    /*
    const resp = await axios.get(
        `https://blockchain.info/rawtx/${utxo.txid}?format=hex`,
    );

    const rawTxHex = resp.data;
    */
    const rawTxHex = await getRawTx(utxo.txid);

    const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const isSegwit = rawTxHex.substring(8, 12) === '0001';

    const input = {
      hash: utxo.txid,
      index: utxo.vout,
      // nonWitnessUtxo: Buffer.from(rawTxHex, 'hex'),
    // witnessUtxo: tx.outs[utxo.vout],
    };

    const witnessUtxo = getWitnessUtxo(tx.outs[utxo.vout]);
    const nonWitnessUtxo = Buffer.from(rawTxHex, 'hex');

    const mixin = isSegwit ? {witnessUtxo} : {nonWitnessUtxo};

    const mixin2 = {};


    const p2wpkh = bitcoin.payments.p2wpkh(
        {
          pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    const p2pkh = bitcoin.payments.p2pkh(
        {pubkey: Buffer.from(cardinalPublicKey, 'hex'),
          network: network,
        });

    let p2sh;
    if (isP2SHAddress(buyerCardinalAddress, network)) {
      // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2wpkh.output, network: network},
      });
    } else {
      // eslint-disable-next-line no-unused-vars
      p2sh = bitcoin.payments.p2sh({
        redeem: {output: p2pkh.output, network: network},
      });
    }

    if (isP2SHAddress(buyerCardinalAddress, network)) {
      mixin2.redeemScript = p2sh.redeem.output;
    }

    if (isP2WSHAddress(buyerCardinalAddress, network)) {
      mixin2.witnessScript = p2sh.redeem.output;
    }

    // check if address is taproot
    if (isTaprootAddress(buyerCardinalAddress)) {
      const p2ktr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(Buffer.from(cardinalPublicKey, 'hex')),
        network: network,
      });

      mixin.witnessUtxo = {
        script: p2ktr.output,
        value: utxo.value,
      };

      input.tapInternalKey = toXOnly(Buffer.from(cardinalPublicKey, 'hex'));
    }

    psbt.addInput({
      ...input,
      ...mixin,
      ...mixin2,
    });

    totalInput += utxo.value;
  }

  // platform fee output

  let platformFeeValue = Math.floor(
      (parseInt(amount) *
    (parseInt(inscription.royalty) + parseInt(PLATFORM_FEES))) /
  10000,
  );

  platformFeeValue = platformFeeValue > 580 ? platformFeeValue : 0;
  if (platformFeeValue > 0) {
    psbt.addOutput({
      address: PLATFORM_FEE_ADDRESS,
      value: platformFeeValue,
    });
  }

  // dummy output for next purchase

  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });

  psbt.addOutput({
    address: buyerCardinalAddress,
    value: 600,
  });


  const fee = await calculateTxBytesFee(
      psbt.txInputs.length,
      psbt.txOutputs.length,
  );

  const totalOutput = psbt.txOutputs.reduce(
      (partialSum, a) => partialSum + a.value,
      0,
  );
  const changeValue = totalInput - totalOutput - fee;

  if (changeValue < 0) {
    console.log('not enough funds');
    throw new Error('not enough funds');
  }

  if (changeValue > 580) {
    psbt.addOutput({
      address: buyerCardinalAddress,
      value: changeValue,
    });
  }

  const unsignedBiddingPSBTBase64 = psbt.toBase64();
  const unsignedBiddingPPSBTBase64InputSize = psbt.data.inputs.length;


  return {
    unsignedBiddingPSBTBase64,
    unsignedBiddingPPSBTBase64InputSize,
  };
}


exports.verifyOrdinalBiddingPsbt = async (req, res) => {
  const id = req.body.id;
  const bidId = req.body.bidId;
  const amount = req.body.amount;
  const psbtHex = req.body.signedBiddingPsbt;
  const buyerOrdinalAddress = req.body.ordinalAddress;

  const ordinal = await Ordinal.findOne({id: id});
  const inscription = await Inscription.findOne({ordinal: ordinal._id});
  const user = await User.findOne({ordinalAddress: ordinal.address});

  const psbtBase64 = Buffer.from(psbtHex, 'hex').toString('base64');

  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
    network,
  });

  const buyerTokenReceiveAddress = psbt.txOutputs[1].address;

  if (buyerTokenReceiveAddress !== buyerOrdinalAddress) {
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: 'invalid receive address',
    });
  }

  const ordCurrentOutput = generateTxidFromHash(
      psbt.txInputs[2].hash,
  ) + ':' + psbt.txInputs[2].index;

  const ordItemFromSignedBiddingPsbt = await getTokenByOutput(ordCurrentOutput);

  const ordItemFromReq = await getTokenById(id);

  if (!ordItemFromSignedBiddingPsbt || !ordItemFromReq) {
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: 'invalid ordinal',
    });
  }

  if (ordItemFromReq.location !== ordItemFromSignedBiddingPsbt.location) {
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: 'invalid location',
    });
  }

  const sellerReceiveAddress = psbt.txOutputs[2].address;

  if (sellerReceiveAddress !== user.cardinalAddress) {
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: 'invalid seller receive address',
    });
  }

  if (psbt.txOutputs[1].value !== 10000) {
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: 'invalid value',
    });
  }

  if (psbt.txOutputs[1].address !== buyerOrdinalAddress) {
    removeOrdinalBid(bidId);
    return res.status(500).send({
      message: 'invalid address',
    });
  }

  const platformFeeValueExpected = Math.floor(
      (parseInt(amount) *
      (parseInt(inscription.royalty) + parseInt(PLATFORM_FEES))) /
    10000,
  );

  if (platformFeeValueExpected > 580) {
    const platformFeeValue = psbt.txOutputs[3].value;
    if (platformFeeValue !== platformFeeValueExpected) {
      removeOrdinalBid(bidId);
      return res.status(500).send({
        message: 'invalid platform fee value',
      });
    }
    if (psbt.txOutputs[3].address !== PLATFORM_FEE_ADDRESS) {
      removeOrdinalBid(bidId);
      return res.status(500).send({
        message: 'invalid platform fee address',
      });
    }
  }

  const bid = await Bid.findById(bidId);
  bid.amount = amount;
  bid.signedBiddigPSBTBase64 = psbtBase64;
  bid.bidderOrdinalAddress = buyerOrdinalAddress;
  bid.tokenId = id;
  bid.valid = true;
  await bid.save();

  res.status(200).send({
    _id: bid._id,
    valid: true,
    tokenId: id,
    amount: amount,
    date: bid.date,
    bidderOrdinalAddress: buyerOrdinalAddress,
  });

  const title = `New Bid | ${ordinal.id} | ${amount}`;
  const content = `${ordinal.id} for ${amount} satoshis`;

  discord.sendNotification(title, content, inscription.image);

  const userEmail = user.email || 'info@function.gallery';

  sendMail(userEmail, bid, 'bid');
};
/**
 * Removes an ordinal bid by its ID.
 *
 * @async
 * @param {string} bidId - The ID of the bid to remove.
 * @throws Will throw an error if the bid cannot be found or the removal fails.
 */
async function removeOrdinalBid(bidId) {
  await Bid.deleteOne({_id: bidId});
  console.log('bid removed', bidId);
}

/*
To accept the bid, you need to replace the dummy script in output at index #2
with the script that you want the money to go to and then sign the ordinal input
regularly (SIGHASH_ALL).
*/

exports.acceptBid = async (req, res) => {
  const id = req.body.id;
  const bidId = req.body.bidId;
  const cardinalAddress = req.body.cardinalAddress;

  const userId = req.userId;

  const ordinal = await Ordinal.findOne({id: id});
  const user = await User.findById(userId);
  const bid = await Bid.findById(bidId);

  if (ordinal.address !== user.ordinalAddress) {
    return res.status(500).send({
      message: 'Unauthorized',
    });
  }

  const signedBiddigPSBTBase64 = bid.signedBiddigPSBTBase64;
  const bidderSignedPsbt = bitcoin.Psbt.fromBase64(signedBiddigPSBTBase64);


  // create output script to replace dummy script
  const outputScript = bitcoin.address.toOutputScript(cardinalAddress, network);

  // replace dummy script with output script
  bidderSignedPsbt.updateOutput(2, {
    script: outputScript,
    value: bidderSignedPsbt.txOutputs[2].value,
  });

  const sellerUnsignedPsbtBase64 = bidderSignedPsbt.toBase64();

  res.status(200).send({
    id: bidId,
    sellerUnsignedPsbtBase64: sellerUnsignedPsbtBase64,
  });
};

exports.finalizeBiddingTransaction = async (req, res) => {
  const bidId = req.body.id;
  const signedBiddingPsbtBase64 = req.body.signedBiddingPsbt;

  const psbtBase64 = Buffer.from(signedBiddingPsbtBase64, 'hex')
      .toString('base64');

  const bid = await Bid.findById(bidId);

  let broadcastedTx;

  try {
    const finalTxHex = await finalizeBuyTransaction(psbtBase64);

    broadcastedTx = await broadcastTransaction(finalTxHex);
  } catch (e) {
    console.log(e.message);
    return res.status(500).send({
      message: e.message,
    });
  }

  if (!broadcastedTx) {
    console.log('broadcastedTx is null');
    return;
  }

  bid.buyingTxHash = broadcastedTx;
  bid.isAccepted = true;

  await bid.save();

  res.status(200).send({
    bidId: bidId,
    tokenId: bid.tokenId,
    tx: broadcastedTx,
  });

  await delay(6000);
  biddingTransactionStatus(broadcastedTx, bidId);

  let {address, value} = await getArtistPaymentInfo(bid.tokenId, bid.amount);
  value = value > 580 ? value : 0;

  if (value > 0) {
    const txIdPayment = await walletController.autoTransaction(value, address);
    console.log('artist royalty payment txId', txIdPayment);
  } else {
    console.log('Amount for royalty is less than 580 satoshis');
  }
};

/**
 * Checks the status of a bidding transaction and
 * updates the bid if the transaction is valid.
 *
 * @param {string} txHash - The transaction hash.
 * @param {string} bidId - The ID of the bid.
 * @return {Promise<void>}
 * A promise that resolves when the operation is complete.
 */
async function biddingTransactionStatus(txHash, bidId) {
  const valid = await checkTransactionStatus(txHash);

  if (valid) {
    console.log('bidding tx valid');
    const bid = await Bid.findById(bidId);

    bid.isConfirmed = true;
    await bid.save();
    await delay(120000);
    console.log('refreshing ordinal data');
    refreshInscriptionData2(bid.tokenId, bid.amount, txHash);
  }
}

exports.checkTransactionStatus = async (req, res) => {
  const id = req.params.id;

  const tx = await getTransactionsByTxId(id);

  if (!tx.status.confirmed) {
    return res.status(200).send({
      confirmed: false,
    });
  }

  return res.status(200).send({
    confirmed: true,
  });
};

/**
 * Checks the status of a dummy transaction and
 * updates the buying or bid if the transaction is valid.
 *
 * @param {string} txHash - The transaction hash.
 * @param {string} buyingId - The ID of the buying or bid.
 * @return {Promise<void>} A promise that resolves
 * when the operation is complete.
 */
async function dummyStatus(txHash, buyingId) {
  const valid = await checkTransactionStatus(txHash);

  if (valid) {
    console.log('dummy tx valid');

    try {
      const buying = await Buying.findById(buyingId);

      buying.dummyConfirmed = true;
      await buying.save();
    } catch (e) {
      const bid = await Bid.findById(buyingId);

      bid.dummyConfirmed = true;
      await bid.save();
    }
  }
}

/**
 * Checks the status of a transaction.
 *
 * @param {string} txHash - The transaction hash.
 * @return {Promise<boolean>}
 * A promise that resolves with a boolean
 * indicating whether the transaction is confirmed.
 */
async function checkTransactionStatus(txHash) {
  return new Promise(async (resolve, reject) => {
    const getStatus = async (hash) => {
      const tx = await getTransactionsByTxId(hash);

      if (!tx) {
        await delay(20000);
        return await getStatus(hash);
      }

      if (!tx.status.confirmed) {
        console.log('tx not confirmed, retrying in 1 minute');
        await delay(60000);
        return await getStatus(hash);
      } else {
        resolve(true);
      }
    };

    await getStatus(txHash);
  });
}

/**
 * Refreshes the inscription data for a given ID and buying ID.
 *
 * @param {string} id - The ID.
 * @param {string} buyingId - The buying ID.
 * @param {string} txHash - The transaction hash.
 * @return {Promise<void>}
 * A promise that resolves when the operation is complete.
 */
async function refreshInscriptionData(id, buyingId, txHash) {
  const tx = await getTransactionsByTxId(txHash);

  const buying = await Buying.findById(buyingId);

  if (!tx) {
    console.log('error getting tx');
    return;
  }

  if (tx.status.confirmed) {
    console.log('tx confirmed, updating ordinal data, waiting 2 min');
    await delay(120000);
    ordinalController.updateOrdinalData(id, buying.amount);

    buying.buyingConfirmed = true;
    await buying.save();

    return;
  }

  console.log('tx not confirmed, retrying in 2 minutes');

  // check elapsed time since tx transaction break recursion
  // if more than 2 hours


  await delay(120000);
  return await refreshInscriptionData(id, buyingId, txHash);
}

/**
 * Refreshes the inscription data for a given ID and transaction hash.
 *
 * @param {string} id - The ID.
 * @param {string} amount - The amount.
 * @param {string} txHash - The transaction hash.
 * @return {Promise<void>}
 * A promise that resolves when the operation is complete.
 */
async function refreshInscriptionData2(id, amount, txHash) {
  const tx = await getTransactionsByTxId(txHash);

  if (!tx) {
    console.log('error getting tx');
    return;
  }

  if (tx.status.confirmed) {
    console.log('tx confirmed, updating ordinal data, waiting 2 min');
    await delay(120000);
    ordinalController.updateOrdinalData(id, amount);

    return;
  }

  console.log('tx not confirmed, retrying in 2 minutes');

  // check elapsed time since tx transaction break recursion
  // if more than 2 hours


  await delay(120000);
  return await refreshInscriptionData2(id, amount, txHash);
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
 * Merges the signed listing PSBT with the signed buying PSBT for a given ID.
 *
 * @param {string} id - The ID.
 * @return {Promise<void>}
 * A promise that resolves when the operation is complete.
 */
async function mergeBuyTransaction(id) {
  const psbt = await Psbt.findOne({tokenId: id});

  const signedListingPsbtBase64 = psbt.signedListingPSBTBase64;
  const signedBuyingPsbtBase64 = psbt.signedBuyingPSBTBase64;

  const mergedPsbt =
  mergeSignedBuyingPsbtBase64(signedListingPsbtBase64, signedBuyingPsbtBase64);

  return mergedPsbt;
}

/**
 * Finalizes a buy transaction.
 *
 * @param {string} mergedPsbt - The merged PSBT.
 * @param {string} publicKey - The public key.
 * @return {Promise<bitcoin.Transaction>}
 * A promise that resolves with the finalized transaction.
 */
async function finalizeBuyTransaction(mergedPsbt, publicKey) {
  const psbt = bitcoin.Psbt.fromBase64(mergedPsbt, {
    network,
  });

  psbt.finalizeAllInputs();

  try {
    const finalTx = psbt.extractTransaction();

    const finalTxHex = finalTx.toHex();
    const transactionId = finalTx.getId();
    console.log(transactionId);
    return finalTxHex;
  } catch (e) {
    console.log(e);
    throw new Error(e.message);
  }
}

/**
 * Broadcasts a transaction to the Bitcoin network.
 *
 * @param {string} finalTxHex - The final transaction in hexadecimal format.
 * @return {Promise<string|null>}
 * A promise that resolves with the transaction ID
 * if the broadcast was successful, or null if an error occurred.
 */
async function broadcastTransaction(finalTxHex) {
  try {
    const result = await axios.post(`${MEMPOOL}tx`, finalTxHex);
    const txId = result.data;

    return txId;
  } catch (e) {
    console.log(e);
    throw new Error(e.message);
  }
}

// get Bid by tokenId
exports.getBidsByTokenId = async (req, res) => {
  const tokenId = req.params.id;

  const promise = new Promise(async (resolve, reject) => {
    Bid.find({tokenId: tokenId, valid: true})
        .sort({date: -1})
        .exec((err, bids) => {
          if (err) {
            reject(err);
          }

          resolve(bids);
        });
  });

  return promise;
};

// get buying by tokenId
exports.getBuyingByTokenId = async (req, res) => {
  const tokenId = req.params.id;

  const promise = new Promise(async (resolve, reject) => {
    Buying.find({ordinalId: tokenId, display: true})
        .populate('user', 'ordinalAddress')
        .sort({date: -1})
        .exec((err, buying) => {
          if (err) {
            reject(err);
          }

          resolve(buying);
        });
  });

  return promise;
};

// get bids and buying transactions by tokenId
exports.getTransactionsByTokenId = async (req, res) => {
  const tokenId = req.params.id;

  const promise = new Promise(async (resolve, reject) => {
    const bids = await Bid.find({tokenId: tokenId, valid: true});

    const bidArray = bids.map((bid) => {
      return {
        _id: bid._id,
        buyingTxHash: bid.buyingTxHash,
        bidderOrdinalAddress: bid.bidderOrdinalAddress,
        amount: bid.amount,
        date: bid.date,
        isConfirmed: bid.isConfirmed,
        type: 'bid',
      };
    });

    const buying = await Buying.find({ordinalId: tokenId, valid: true})
        .populate('user', 'ordinalAddress');

    const buyingArray = buying.map((buy) => {
      return {
        _id: buy._id,
        buyingTxHash: buy.buyingTxHash,
        bidderOrdinalAddress: buy.user.ordinalAddress,
        amount: buy.amount,
        date: buy.date,
        isConfirmed: buy.buyingConfirmed,
        type: 'buy',
      };
    });

    const mint = await Mint.find({tokenId: tokenId});

    const mintArray = [];

    // convert mint object to array


    for (const m of mint) {
      mintArray.push({
        _id: m._id,
        buyingTxHash: m.txHash,
        bidderOrdinalAddress: m.address,
        amount: m.amount,
        date: m.date,
        isConfirmed: true,
        type: 'mint',
      });
    }


    const transactions = bidArray.concat(buyingArray).concat(mintArray);

    transactions.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    resolve(transactions);
  });

  return promise;
};
/*
exports.getInscribingTransactionsByUsers = async (req, res) => {
  const userId = req.userId;
  const user = User.findById(userId);

  const promise = new Promise(async (resolve, reject) => {
    Mint.find({address: user.ordinalAddress, valid: false})
        .sort({date: -1})
        .exec((err, mint) => {
          if (err) {
            reject(err);
          }

          const mintArray = mint.map((m) => {
            return {
              _id: m._id,
              buyingTxHash: m.txHash,
              collectionId: m.collectionId,
              tokenId: m.tokenId,
              bidderOrdinalAddress: m.address,
              amount: m.amount,
              date: m.date,
              valid: m.valid,
              type: 'mint',
            };
          });

          resolve(mintArray);
        });
  });

  return promise;
};

*/

// get transactions by ordinal address from user id
exports.getSwapTransactionsByUsers = async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId);

  const promise = new Promise(async (resolve, reject) => {
    const bids = await Bid.find({bidderOrdinalAddress: user.ordinalAddress,
      dummyConfirmed: true,
      $or: [{valid: false}, {isConfirmed: false}],
    });

    const bidArray = bids.map((bid) => {
      return {
        _id: bid._id,
        tokenId: bid.tokenId,
        buyingTxHash: bid.buyingTxHash,
        dummyConfirmed: bid.dummyConfirmed,
        bidderOrdinalAddress: bid.bidderOrdinalAddress,
        amount: bid.amount,
        date: bid.date,
        isConfirmed: bid.isConfirmed,
        valid: bid.valid,
        type: 'bid',
      };
    });

    const buying = await Buying.find({user: userId,
      dummyConfirmed: true,
      $or: [{valid: false}, {buyingConfirmed: false}],
    })
        .populate('user', 'ordinalAddress');

    const buyingArray = buying.map((buy) => {
      return {
        _id: buy._id,
        tokenId: buy.ordinalId,
        buyingTxHash: buy.buyingTxHash,
        dummyConfirmed: buy.dummyConfirmed,
        bidderOrdinalAddress: buy.user.ordinalAddress,
        amount: buy.amount,
        date: buy.date,
        isConfirmed: buy.buyingConfirmed,
        valid: buy.valid,
        type: 'buy',
      };
    });


    const transactions = bidArray.concat(buyingArray);

    transactions.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    resolve(transactions);
  });

  return promise;
};

// user has pending transactions
exports.hasPendingTransactions = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  const bids = await Bid.find(
      {bidderOrdinalAddress: user.ordinaAddress,
        $or: [{dummyConfirmed: false}, {valid: false}, {isConfirmed: false}],
      });

  if (bids.length > 0) {
    return res.status(200).send({
      hasPendingTransactions: true,
    });
  }

  const buying = await Buying.find(
      {user: userId,
        $or: [{dummyConfirmed: false},
          {valid: false}, {buyingConfirmed: false}],
      });

  if (buying.length > 0) {
    return res.status(200).send({
      hasPendingTransactions: true,
    });
  }


  return res.status(200).send({
    hasPendingTransactions: false,
  });
};

// has inscribing pending transactions
exports.hasInscribingTransactions = async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId);

  const mint = await Mint.find({address: user.ordinalAddress, valid: false});

  if (mint.length > 0) {
    return res.status(200).send({
      hasInscribingTransactions: true,
    });
  }

  return res.status(200).send({
    hasInscribingTransactions: false,
  });
};

// get highest bid amount by tokenId
exports.getHighestBidAmountByTokenId = async (req, res) => {
  const tokenId = req.params.id;

  const promise = new Promise(async (resolve, reject) => {
    // get the highest bid amount
    Bid.find({tokenId: tokenId})
        .sort({amount: -1})
        .exec((err, bids) => {
          if (err) {
            reject(err);
          }

          if (bids.length > 0) {
            resolve(bids[0]);
          } else {
            resolve({});
          }
        });
  });

  return promise;
};

// cancelOrdinalBidding
exports.cancelOrdinalBidding = async (req, res) => {
  const id = req.params.id;
  const userId = req.userId;
  const user = await User.findById(userId);
  /*
  const ordinal = await Ordinal.findOne({ id: id });

  if (!ordinal) {
    return res.status(500).send({
      message: "ordinal not found",
    });
  }

  await ordinal.save();
  */

  // remove bid
  await Bid.deleteOne({_id: id, bidderOrdinalAddress: user.ordinalAddress});

  res.status(200).send({
    id,
    message: 'success cancelling ordinal bidding',
  });
};


// cancelOrdinalListing
exports.cancelOrdinalListing = async (req, res) => {
  const id = req.params.id;
  const userId = req.userId;

  const user = await User.findById(userId);

  const ordinal = await Ordinal.findOne({id: id, address: user.ordinalAddress});

  const inscription = await Inscription.findOne({ordinal: ordinal._id});
  const collection = await Collection.findOne({_id: inscription.collectionRef});

  if (!ordinal) {
    return res.status(500).send({
      message: 'ordinal not found',
    });
  }

  ordinal.onSale = false;
  await ordinal.save();

  collection.onSaleInscriptions = collection.onSaleInscriptions - 1;
  await collection.save();

  // remove psbt
  await Psbt.deleteOne({tokenId: id});


  res.status(200).send({
    id,
    onSale: false,
    message: 'success cancelling ordinal listing',
  });
};

// cancelOrdinalBuying
exports.cancelOrdinalBuying = async (req, res) => {
  const id = req.params.id;

  // check user is the buyer
  const userId = req.userId;

  await Buying.deleteOne(
      {_id: id,
        user: userId,
        $or: [{valid: false}, {buyingConfirmed: false}],
      });

  res.status(200).send({
    id,
    message: 'success cancelling ordinal buying',
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

/**
 * Retrieves the payment information for an artist.
 *
 * @param {string} tokenId - The token ID.
 * @param {number} amount - The amount of the payment.
 * @return {Promise<Object>}
 * A promise that resolves with an object containing
 * the artist's address and the value of the payment.
 */
async function getArtistPaymentInfo(tokenId, amount) {
  const sellingPrice = amount;

  const ordinal = await Ordinal.findOne({id: tokenId});
  const inscription = await Inscription.findOne({ordinal: ordinal._id});
  const user = await User.findOne({ordinalAddress: ordinal.address});

  const collection = await Collection.findOne({_id: inscription.collectionRef});

  const royalty = collection.royalty || inscription.royalty;

  const address = user.cardinalAddress;

  const value = Math.floor((parseInt(sellingPrice) *
    (parseInt(royalty)) / 10000));

  return {
    address,
    value,
  };
}

/**
 * Retrieves a transaction by its ID.
 * @param {string} txId - The transaction ID.
 * @return {Promise<Object>}
 * A promise that resolves with the transaction.
 */
async function getRawTx(txId) {
  const resp = await axios.get(
      `${MEMPOOL}tx/${txId}/hex`, {});

  return resp.data;
};
