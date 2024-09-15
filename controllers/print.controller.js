const db = require('../models');
const mail = require('../middlewares/mail');
const keyManager = require('../middlewares/keyManager');
const walletManager = require('../middlewares/walletManager');
require('dotenv').config();
const Wallet = db.wallet;
const Serie = db.serie;
const Element = db.element;
const Media = db.media;
const Fiat = db.fiat;
const Transaction = db.transaction;
const Payment = db.payment;
const Order = db.order;
const Customer = db.customer;

const axios = require('axios');
const puppeteer = require('puppeteer');
const bcrypt = require('bcryptjs');
const keccak256 = require('keccak256')
const serieController = require('./serie.controller');
const storageUpload = require('../middlewares/storageUpload');
const Sketch = require('../models/sketch.model');
const Whitelist = require('../models/whitelist.model');

const stripe = require("stripe")('sk_test_51INl1iHxwzCEp0yUOSY7MHhyKuXu0IHD8Q4IIkLmDJBbV1FUa6B3JORUxpEiLvvCOtNFgx3VPqudTlcxKZ23Tsdq00ul7qZ5PA');

const BASE_URL = process.env.BASE_URL;
const STORAGE_URL = process.env.STORAGE_URL;

const SWISSPOST_API_URL = process.env.SWISSPOST_API_URL;
const SWISSPOST_API_KEY = process.env.SWISSPOST_API_KEY;

/** ----- Print Payment Controller ---- */
exports.createPrintPaymentIntent = async (req, res) => {

    const id = req.params.id;
    const price = req.body.price * 100;
    const currency = req.body.currency;

    const userId = req.userId;

    const serie = await Serie.findById(id);
    const amount = serie.priceUSD * 100;

    /*
    if (amount !== price) {
        return res.status(400).send({ message: 'Price mismatch.' });
    }
    */

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

const getCountryList = async () => {
    const response = await axios.get(`${SWISSPOST_API_URL}/countries?lang=en&fields=isoCode,displayName`, {
        headers: {
            'X-Apim-Api-Key': SWISSPOST_API_KEY,
        },
    });

    const countries = response.data.countries;

    return countries;

};

exports.getCountryList = async (req, res) => {
    const countries = await getCountryList();

    res.status(200).send({
        countries: countries,
    });
};

exports.getCountryInfo = async (req, res) => {
    const countryIsoCode = req.params.code;
    const format = req.query.format;
    const weight = req.query.weight;

    const response = await axios.get(`${SWISSPOST_API_URL}/products/?isoCode=${countryIsoCode}&format=${format}&weight=${weight}`, {
        headers: {
            'X-Apim-Api-Key': SWISSPOST_API_KEY,
        },
    });

    const countryInfo = response.data;

    res.status(200).send({
        countryInfo: countryInfo,
    });

};


/*
const getCountryCode = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.address && data.address.country_code) {
        return data.address.country_code.toUpperCase()
      } else {
        throw new Error('Country code not found')
      }
    } catch (error) {
      console.error('Error fetching country code:', error)
      return null
    }
  }
*/

exports.getCountryCode = async (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'spectra/v1 (https://spectra.gallery)',
            },
        });
        const data = response.data;

        if (data.address && data.address.country_code) {
            res.status(200).send({
                countryCode: data.address.country_code.toUpperCase(),
            });
        } else {
            throw new Error('Country code not found');
        }
    } catch (error) {
        console.error('Error fetching country code:', error);
        res.status(500).send({
            message: 'Error fetching country code',
        });
    }
};

exports.calculatePaperWeight = async (req, res) => {
    const width = req.query.width;
    const height = req.query.height;
    const thick = req.query.thick;
    const density = req.query.density; // g/m2

    // convert density from g/cm2 to g/mm2
    const density_mm2 = density / 1000000;

    const volume = width * height * thick;
    const weight = volume * density_mm2;

    res.status(200).send({
        weight: weight,
    });
};

// get photo paper price depending on the size, thickness and density
exports.getPaperPrintPrice = async (req, res) => {
    const width = req.query.width;
    const height = req.query.height;
    const thick = req.query.thick;
    const density = req.query.density * 100; // g/cm3 to g/mm3

    // Define a base price per square meter
    const basePricePerSquareMeter = 100; // €/m²

    // Function to calculate additional cost based on thickness
    function calculateThicknessCost(thickness) {
        const thicknessBaseFactor = 5; // €/mm as a base factor
        const thicknessExponent = 1.5; // exponent to reflect increasing cost with more thickness
        return thicknessBaseFactor * Math.pow(thickness, thicknessExponent);
    }

    // Function to calculate additional cost based on density
    function calculateDensityCost(density) {
        const densityBaseFactor = 15; // €/g/mm³ as a base factor
        const densityLogBase = 2; // base of the logarithm
        return densityBaseFactor * Math.log(density + 1) / Math.log(densityLogBase);
    }

    // Convert dimensions from mm to meters for area calculation
    const widthMeters = width / 1000;
    const heightMeters = height / 1000;

    // Calculate the area in square meters
    const area = widthMeters * heightMeters;

    // Calculate additional cost due to thickness
    const additionalCostThickness = calculateThicknessCost(thick);

    // Calculate additional cost due to density
    const additionalCostDensity = calculateDensityCost(density);

    // Total additional cost
    const totalAdditionalCost = additionalCostThickness + additionalCostDensity;

    // Final price calculation
    const finalPrice = area * (basePricePerSquareMeter + totalAdditionalCost);




    res.status(200).send({
        price: finalPrice.toFixed(2)
    });

};

exports.generatePrint = async (req, res) => {
    const userId = req.userId;
    const serieId = req.body.serieId;

    const identifier = req.body.identifier;
    const amount = req.body.amount;
    const artworkValue = req.body.artworkValue;
    const mintValue = req.body.mintValue;
    const printValue = req.body.printValue;
    const transportValue = req.body.transportValue;

    const order = await Order.findOne({
        identifier: identifier
    });

    if (!order) {
        return res.status(404).send({
            message: 'Order not found.'
        });
    }

    const identifierValid = bcrypt.compareSync(identifier, order.identifier);

    if (!identifierValid) {
        return res.status(401).send({
            message: 'Invalid identifier.'
        });
    }

    if (!order.paid) {
        return res.status(400).send({
            message: 'Order not paid.'
        });
    }

    if (artworkValue !== order.artworkValue || printValue !== order.printValue || transportValue !== order.transportValue) {
        return res.status(400).send({
            message: 'Values mismatch.'
        });
    }

    const orderTotalValue = order.artworkValue + order.printValue + order.transportValue;

    if (amount !== orderTotalValue) {
        return res.status(400).send({
            message: 'Payment Amount mismatch.'
        });
    }

    Serie.findById(serieId)
        .populate('sketch')
        .populate('whitelist')
        .exec(async (err, serie) => {
            if (err) {
                return res.status(500).send({
                    message: err
                });
            }

            if (!serie) {
                return res.status(404).send({
                    message: 'Serie not found.'
                });
            }

            if (!serie.onSale) {
                return res.status(400).send({
                    message: 'Serie not on sale.'
                });
            }

            const whitelist = serie.whitelist;
            let whitelistItem = null;

            if (whitelist.length > 0) {
                whitelistItem = whitelist.find((item) => {
                    return item.address === userId;
                })

                if (whitelistItem) {
                    if (whitelistItem.value !== mintValue) {
                        return res.status(400).send({
                            message: 'Mint Value mismatch.'
                        });
                    }
                } else {
                    if (serie.supply + whitelist.length >= serie.totalSupply) {
                        serie.onSale = false;
                        await serie.save();
                        res.status(500).send({
                            message: 'Serie sold out.'
                        });
                        return;
                    }
                }
            } else {
                if (serie.supply >= serie.totalSupply) {
                    serie.onSale = false;
                    await serie.save();
                    res.status(500).send({
                        message: 'Serie sold out.'
                    });
                    return;
                }
            }

            const fileUrl = serie.sketch.url;

            if (!fileUrl || fileUrl === '') {
                return res.status(404).send({
                    message: 'File not found.'
                });
            }

            const fetchUrl = STORAGE_URL + fileUrl;
            const rsp = await axios.get(fetchUrl);
            const fileContent = rsp.data;

            const iteration = serie.supply + 1;

            const { hashedHtmlContent, hash } = await generateIframe(iteration, serieId, fileContent);

            const contentUrl =
                await storageUpload.uploadStoragePrint(hashedHtmlContent, userId, serieId, hash);

            const traits = await getAttributes(hashedHtmlContent, contentUrl);

            console.log('attributes', traits);
            const _traits = [];
            for (const trait of traits) {
                const attr = new Trait({
                    trait_type: trait.trait_type,
                    value: trait.value,
                });
                await attr.save();
                _traits.push(attr._id);
            }

            const slug = serie.name.toLowerCase().replace(/ /g, '-');

            const image = await storageUpload.uploadStorageImg(contentUrl, serie.captureDelay, serie.cssSelector, hash, userId, slug);

            const media = new Media({
                url: image,
                width: width,
                height: height,
                ratio: ratio,
                type: 'image',
            });

            await media.save();

            const sketch = new Sketch({
                url: contentUrl,
                html: serie.sketch.html,
                css: serie.sketch.css,
                javascript: serie.sketch.javascript,
                hash: hash
            });

            await sketch.save();

            // generate a random tokenId in the form of an ethereum nft id
            const tokenIdRand = ((Math.floor(Math.random() * 1000000)) +
                (Math.floor(Math.random() * 100) + 1) + Date.now()).toString();

            const element = new Element({
                name: serie.name,
                subtitle: serie.subtitle,
                slug: slug,
                tokenId: tokenIdRand,
                iteration: iteration,
                description: serie.description,
                address: userId,
                media: media._id,
                sketch: sketch._id,
                artists: serie.artists,
                owner: userId,
                serieRef: serieId,
                trait: _traits,
                onSale: false,
                onChain: serie.onChain,
                royalty: serie.royalty,
                chain: serie.chain,
            });

            await element.save();

            serie.elements.push(element._id);
            serie.supply += 1;
            serie.rank += 10;

            const whiteListIds = serie.whitelist.map((item) => {
                return item._id;
            });

            let _whitelistItem;
            const _whitelist = await Whitelist.find({
                _id: {
                    $in: whiteListIds
                }
            });

            if (_whitelist.length > 0) {
                _whitelistItem = _whitelist.find((item) => {
                    return item.address === userId && !item.used;
                });
            }
            if (_whitelistItem && !_whitelistItem.paid) {
                serie.volumeUSD += parseInt(_whitelistItem.value);
                _whitelistItem.paid = true;
                await _whitelistItem.save();
            } else {
                serie.volumeUSD += parseInt(serie.priceUSD);
            }

            await serie.save();

            const title = `New Print | ${serie.name} #${iteration}`;
            const content = `${serie.name} by ${serie.artists[0].name} has been printed.`;

            // discord.sendNotification(title, content, image);
            // load element afterward on the client
            res.status(200).send({
                id: element._id,
                serieId: serieId,
                serie: {
                    id: serie._id,
                    onSale: serie.onSale,
                    supply: serie.supply,
                    volumeUSD: serie.volumeUSD,
                }

            });

            order.generated = true;
            await order.save();
        })
        .catch((err) => {
            res.status(500).send({
                message: err
            });
        });


};

const generateIframe = async (iteration, id, htmlContent) => {

    const timestamp = Date.now();

    const hash = await generateHash(iteration, id, timestamp);

    const hashFunction = `let injectSeed = "${hash}";`;
    htmlContent = htmlContent.replace('___FIDDLER__HASH___', hashFunction);

    return {
        htmlContent: htmlContent,
        hash: hash,
    };

};

const generateHash = async (iteration, id, timestamp) => {

    const tokenIdRand = ((Math.floor(Math.random() * 1000000)) +
        (Math.floor(Math.random() * 100) + 1)).toString();

    const hash = keccak256(iteration.toString() + id + timestamp + tokenIdRand).toString('hex');

    return hash;
};

/**
 * Fetches attributes from HTML content.
 *
 * @param {string} htmlContent - The HTML content to fetch attributes from.
 * @param {string} url - The URL of the page to fetch attributes from.
 * @return {Array} The fetched attributes.
 */
async function getAttributes(htmlContent, url) {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        await page.goto(url, { waitUntil: 'load' });

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
}

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
