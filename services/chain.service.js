const path = require('path');
const { ethers } = require('ethers');

const ETH_API_URL = process.env.ETH_API_URL;
const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const ACCESS_CONTROL_ADDRESS = process.env.ACCESS_CONTROL_ADDRESS;
const DAO_CONTRACT_ADDRESS = process.env.DAO_CONTRACT_ADDRESS; // optional, read-only used elsewhere

let _provider, _wallet, _ac, _acAbi;

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

function getAccessControl() {
  if (_ac) return _ac;
  const w = getWallet();
  if (!w || !ACCESS_CONTROL_ADDRESS) return null;
  if (!_acAbi) {
    // Load ABI from backend artifacts
    const abiPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'AccessControl.sol', 'AccessControl.json');
    try {
      _acAbi = require(abiPath).abi;
    } catch (e) {
      return null;
    }
  }
  try {
    _ac = new ethers.Contract(ACCESS_CONTROL_ADDRESS, _acAbi, w);
    return _ac;
  } catch (_) {
    return null;
  }
}

// Map friendly roleName to AccessControl.Role enum index
const ROLE_MAP = {
  contract: 0,
  admin: 1,
  creator: 2,
  thinker: 3,
  myself: 4,
};

async function grantRoleOnChain(address, roleName) {
  const ac = getAccessControl();
  if (!ac) return { ok: false, error: 'access_control_not_configured' };
  const roleIdx = ROLE_MAP[String(roleName).toLowerCase()];
  if (typeof roleIdx !== 'number') return { ok: false, error: 'invalid_role' };
  try {
    // Prefer grantRoleByDAO if wallet has Contract role; fallback to admin grantRole if permitted
    let tx;
    try {
      tx = await ac.grantRoleByDAO(roleIdx, address);
    } catch (_) {
      tx = await ac.grantRole(roleIdx, address);
    }
    const receipt = await tx.wait();
    return { ok: true, txHash: receipt.transactionHash };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

module.exports = {
  isConfigured: () => Boolean(getAccessControl()),
  grantRoleOnChain,
  async roleState(address) {
    const ac = getAccessControl();
    if (!ac) return { ok: false, error: 'access_control_not_configured' };
    try {
      const roles = ['Admin','Creator','Thinker','Myself'];
      const state = {};
      for (const r of roles) {
        const has = await ac.hasRole(module.exports._roleEnumIndex(r), address);
        state[r.toLowerCase()] = Boolean(has);
      }
      return { ok: true, address, state };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  },
  _roleEnumIndex(name) {
    const map = { Contract:0, Admin:1, Creator:2, Thinker:3, Myself:4 };
    return map[name] ?? 0;
  }
};
