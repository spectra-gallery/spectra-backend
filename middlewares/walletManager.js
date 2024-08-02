const db = require('../models');
// const mail = require('../middlewares/mail');
require('dotenv').config();
const Wallet = db.wallet;

const axios = require('axios');

const MEMPOOL = process.env.MEMPOOL_ADDRESS;

/**
 * Assigns a wallet ID to the WalletManager instance.
 *
 * @async
 * @return {string} The assigned wallet ID.
 * @throws Will throw an error if no wallet with sufficient balance is found.
 */
class WalletManager {
  /**
 * Description of the method.
 *
 * @param {Type} paramName - Description of the parameter.
 */
  constructor() {
    // singleton instance
    if (!WalletManager.instance) {
      this.walletId = process.env.WALLET_ID_0;
      WalletManager.instance = this;
    }
    return WalletManager.instance;
  }
  /**
 * Gets the wallet ID of the WalletManager instance.
 *
 * @return {string} The wallet ID.
 */
  getWalletId() {
    return this.walletId;
  }
  /**
 * Sets the wallet ID of the WalletManager instance.
 *
 * @param {string} walletId - The new wallet ID.
 */
  setWalletId(walletId) {
    this.walletId = walletId;
  }

  /**
 * Assigns a wallet ID to the WalletManager instance.
 *
 * @async
 * @return {string} The assigned wallet ID.
 * @throws Will throw an error if no wallet with sufficient balance is found.
 */
  async assignWalletId() {
    await Wallet.updateMany({}, {assigned: false});


    const wallets = await Wallet.find()
        .sort({txs: 1})
        .exec();

    for (const wallet of wallets) {
      const balance = await getBalance(wallet.address);
      const hasUnconfirmedTx = await hasUnconfirmedTransactions(wallet.address);
      if (balance >= 60000 && !hasUnconfirmedTx) {
        this.walletId = wallet._id;
        wallet.assigned = true;
        await wallet.save();
        // sendMail('pmosi76@gmail.com', wallet, 'walletSwitch');
        return this.walletId;
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

    this.walletId = wallet.id;
    // sendMail('pmosi76@gmail.com', wallet, 'walletSwitch');

    const newWallet = await Wallet.findById(wallet.id);
    newWallet.assigned = true;
    await newWallet.save();

    return wallet.id;
  }
}

/**
 * Gets the balance of a given address.
 *
 * @async
 * @param {string} address - The address to get the balance of.
 * @return {number} The balance of the address.
 * @throws Will throw an error if the request fails.
 */
async function getBalance(address) {
  try {
    /*
    const response = await axios.get(
        `https://blockchain.info/balance?active=${address}`,
    );

    const balance = response.data[address].final_balance; */

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

/**
 * Has unconfirmed transactions for a given address.
 * @param {string} address - The address to check.
 */
async function hasUnconfirmedTransactions(address) {
  const transactions = await getTransactions(address);

  const unconfirmedTransactions = transactions.filter(
      (tx) => tx.status.confirmed === false,
  );

  return unconfirmedTransactions.length > 0;
};

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

const walletManager = new WalletManager();

module.exports = walletManager;
