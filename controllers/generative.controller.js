const db = require("../models");
const mail = require("../middlewares/mail");

require("dotenv").config();
const Serie = db.serie;
const User = db.user;

const { ethers } = require("ethers");

const puppeteer = require('puppeteer');

const contract = require("../artifacts/contracts/Spectra.sol/Spectra.json");
const { parse } = require("path");

const storageUpload = require("../middlewares/storageUpload");

const ETH_API_URL = process.env.ETH_API_URL;
const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const SPECTRA_CONTRACT_ADDRESS = process.env.SPECTRA_CONTRACT_ADDRESS;

const alchemyProvider = new ethers.providers.JsonRpcProvider(ETH_API_URL);

const wallet = new ethers.Wallet(ETH_PRIVATE_KEY, alchemyProvider);

const spectraContract = new ethers.Contract(
  SPECTRA_CONTRACT_ADDRESS,
  contract.abi,
  wallet
);

// NFTs Marketplace
exports.getProjects = async (req, res) => {
  const number = parseInt(req.params.number);

  let projects = [];

  for (let i = 0; i < 1; i++) {
    const project = await spectraContract.getProject(i);

    // convert base64 to json
    let projectJson = atob(project.split(",")[1]);

    projectJson = projectJson.slice(0, -3) + projectJson.slice(-2);
    // check for invalid control characters
    projectJson = projectJson.replace(/[\u0000-\u001F]+/g, "");
    const projectDecoded = JSON.parse(projectJson);

    projects.push({
      id: i,
      name: projectDecoded.name,
      description: projectDecoded.description,
      image: projectDecoded.image,
      artist: projectDecoded.artist,
      price: parseInt(projectDecoded.price),
      supply: parseInt(projectDecoded.supply),
      maxSupply: parseInt(projectDecoded.maxSupply),
      onSale: projectDecoded.onSale === "true",
    });
  }

  res.status(200).send({
    projects,
  });
};

exports.createNft = async (req, res) => {
  const id = req.params.id;
  const hash = req.body.hash;

  const serie = await Serie.findById(id);

  serie.projectId = req.body.projectId;
  serie.published = true;
  serie.publishHash = hash;

  await serie.save();

  res.status(200).send({
    message: "NFT created",
  });
};

const getSketch = async (projectId) => {
  const sketch = await spectraContract.getSketches(projectId);

  console.log(sketch);

  return sketch;
};

const assign = async (tokenId, image, hash, attributes) => {
  const hashBytes = stringToBytes32(hash);
  const assigned = await spectraContract.assign(tokenId, image, hashBytes, attributes);

  console.log(assigned);

  return assigned;
};

const stringToBytes32 = (string) => {
  /*
  if (string.length > 32) {
    console.log(string)
    throw new Error('String is too long for bytes32.')
  }
  */

  // Convert string to a Buffer
  const buffer = Buffer.from(string, 'utf8')

  // Create a new 32-byte buffer and fill it with zeros
  const bytes32 = Buffer.alloc(32)
  buffer.copy(bytes32)

  // Convert to hex string
  return '0x' + bytes32.toString('hex')
};

const generateHtml = async (sketch) => {

  const { html, css, javascript } = sketch;

  const sketchHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <style>
      ${css}
    </style>
  </head>
  <body>
    ${html}
    <script>
      ${javascript}
    </script>
  </body>
  </html>
  `;

  return sketchHtml;
}

const generateImg = async (projectId, _hash) => {
  const serie = await Serie.findOne({ projectId: projectId }).populate(
    "sketch",
    "-__v"
  )
  .populate("trait", "-__v");

  const sketchHtml = await generateHtml(serie.sketch);
  console.log(sketchHtml);
  try {
    const image = await storageUpload.uploadETHStorageImg(
      sketchHtml,
      serie.captureDelay,
      serie.cssSelector,
      _hash,
      serie.slug,
      serie._id
    );

    console.log(image);

    return image;
  } catch (error) {
    console.log(error);
  }
};

const generateAttributes = async (projectId) => {
  const serie = await Serie.findOne({ projectId: projectId }).populate(
    "trait",
    "-__v"
  );

  const htmlContent = await generateHtml(serie.sketch);

  const attributes = await parseAttributes(htmlContent);

  return attributes;
};

const parseAttributes = async (htmlContent, hash) => {


  const hashFunction = `let injectSeed = "${hash}";`
  const sketchContent = htmlContent.replace('___FIDDLER__HASH___', hashFunction)

    try {
      const browser = await puppeteer.launch({headless: 'new'});
      const page = await browser.newPage();
  
      await page.setViewport({
        width: 800,
        height: 800,
        deviceScaleFactor: 1,
      });
    
      await page.setContent(sketchContent);
  
      await delay(5000);
  
      // get variable window.$functionAttribute
      const filteredArray = await page.evaluate(() => {
        return window.$spectraAttribute;
      });
  
  
      const attributes = filteredArray;
  
      const traits = [];
      for (const key in attributes) {
        if (!attributes.hasOwnProperty(key)) continue;
        traits.push({
          trait_type: key,
          value: attributes[key],
        });
      }
      await browser.close();
  
      return traits;
    } catch (err) {
      console.log(err);
    }
  
};

// listen for mint event
exports.listenForMint = async (req, res) => {
  spectraContract
    .on("Minted", async (address, tokenId, projectId, value, event) => {
      const transactionHash = event.transactionHash;

      const img = await generateImg(projectId, transactionHash);
      const attributes = await generateAttributes(projectId);

      await assign(tokenId, img, transactionHash, attributes);

      console.log("Minted", address, tokenId, projectId, value, event);

      res.status(200).send({
        tokenId: tokenId,
        projectId: projectId,
        hash: transactionHash,
        img: img,
      });
    })
    .on("error", (error) => {
      res.status(500).send({
        message: error,
      });
    });
};

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param {number} time - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}
