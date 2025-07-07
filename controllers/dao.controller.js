const db = require('../models');
const mail = require('../middlewares/mail');

require('dotenv').config();
const User = db.user;

const { ethers } = require('ethers');

const contract = require("../artifacts/contracts/DAO.sol/DAO.json");

const ETH_API_URL = process.env.ETH_API_URL;
const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const DAO_CONTRACT_ADDRESS = process.env.DAO_CONTRACT_ADDRESS;

const alchemyProvider = new ethers.providers.JsonRpcProvider(ETH_API_URL);

const wallet = new ethers.Wallet(ETH_PRIVATE_KEY, alchemyProvider);

const daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, contract.abi, wallet);

exports.getMembershipRequests = async (req, res) => {
    let requests = [];  
    
    const requestsCount = await daoContract.getMembershipRequestCount();
    const count = Number(requestsCount._hex);
    for (let i = 1; i < count + 1; i++) {
        const request = await daoContract.getMembershipRequest(i);
        requests.push(request);
    }

    res.status(200).send({
        requests,
    });
}