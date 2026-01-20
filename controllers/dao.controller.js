const db = require('../models');
const mail = require('../middlewares/mail');

require('dotenv').config();
const User = db.user;

const { ethers } = require('ethers');

const contract = require("../artifacts/contracts/DAO.sol/DAO.json");

const ETH_API_URL = process.env.ETH_API_URL;
const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const DAO_CONTRACT_ADDRESS = process.env.DAO_CONTRACT_ADDRESS;

let daoContract = null;
function getDao() {
  // lazily initialize only if all envs are present
  if (daoContract) return daoContract;
  if (!ETH_API_URL || !ETH_PRIVATE_KEY || !DAO_CONTRACT_ADDRESS) return null;
  try {
    const provider = new ethers.providers.JsonRpcProvider(ETH_API_URL);
    const wallet = new ethers.Wallet(ETH_PRIVATE_KEY, provider);
    daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, contract.abi, wallet);
    return daoContract;
  } catch (_) {
    return null;
  }
}

exports.getMembershipRequests = async (req, res) => {
    const dao = getDao();
    if (!dao) return res.status(503).json({ error: 'DAO not configured' });
    let requests = [];
    const requestsCount = await dao.getMembershipRequestCount();
    const count = Number(requestsCount._hex);
    for (let i = 1; i < count + 1; i++) {
        const request = await dao.getMembershipRequest(i);
        requests.push(request);
    }

    res.status(200).send({
        requests,
    });
}
