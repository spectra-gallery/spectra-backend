const path = require('path');
const { ethers } = require('ethers');

const ETH_API_URL = process.env.ETH_API_URL;
const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const DAO_CONTRACT_ADDRESS = process.env.DAO_CONTRACT_ADDRESS;

let _provider, _wallet, _dao, _daoAbi;

function getProvider() {
  if (!_provider && ETH_API_URL) {
    _provider = new ethers.providers.JsonRpcProvider(ETH_API_URL);
  }
  return _provider;
}

function getWallet() {
  const p = getProvider();
  if (!_wallet && p && ETH_PRIVATE_KEY) {
    _wallet = new ethers.Wallet(ETH_PRIVATE_KEY, p);
  }
  return _wallet;
}

function getDao() {
  if (_dao) return _dao;
  const p = getProvider();
  if (!p || !DAO_CONTRACT_ADDRESS) return null;
  if (!_daoAbi) {
    const abiPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'DAO.sol', 'DAO.json');
    try { _daoAbi = require(abiPath).abi; } catch (_) { return null; }
  }
  try {
    const signer = getWallet() || p;
    _dao = new ethers.Contract(DAO_CONTRACT_ADDRESS, _daoAbi, signer);
    return _dao;
  } catch (_) {
    return null;
  }
}

function ensureDao() {
  const dao = getDao();
  if (!dao) return { ok: false, error: 'dao_not_configured' };
  return { ok: true, dao };
}

async function buildTx(fn, args = [], valueEth) {
  const { ok, dao, error } = ensureDao();
  if (!ok) return { ok, error };
  try {
    const tx = await dao.populateTransaction[fn](...(args || []), valueEth ? { value: ethers.utils.parseEther(String(valueEth)) } : {});
    return { ok: true, to: DAO_CONTRACT_ADDRESS, data: tx.data, value: valueEth ? String(valueEth) : '0' };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

async function sendTx(fn, args = [], valueEth) {
  const dao = getDao();
  const w = getWallet();
  if (!dao || !w) return { ok: false, error: 'wallet_or_dao_not_configured' };
  try {
    const overrides = valueEth ? { value: ethers.utils.parseEther(String(valueEth)) } : {};
    const tx = await dao[fn](...(args || []), overrides);
    const receipt = await tx.wait();
    return { ok: true, txHash: receipt.transactionHash };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

module.exports = {
  isConfigured: () => Boolean(getDao()),
  address: () => DAO_CONTRACT_ADDRESS,
  buildTx,
  sendTx,
};

