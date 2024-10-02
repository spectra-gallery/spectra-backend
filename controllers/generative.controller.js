const db = require('../models');
const mail = require('../middlewares/mail');

require('dotenv').config();
const User = db.user;

const { ethers } = require('ethers');

const contract = require("../artifacts/contracts/Spectra.sol/Spectra.json");

const ETH_API_URL = process.env.ETH_API_URL;
const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const SPECTRA_CONTRACT_ADDRESS = process.env.SPECTRA_CONTRACT_ADDRESS;

const alchemyProvider = new ethers.providers.JsonRpcProvider(ETH_API_URL);

const wallet = new ethers.Wallet(ETH_PRIVATE_KEY, alchemyProvider);

const spectraContract = new ethers.Contract(SPECTRA_CONTRACT_ADDRESS, contract.abi, wallet);

// NFTs Marketplace

