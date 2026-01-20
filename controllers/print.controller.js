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
const { SwissPostClient, SwissPostAddressClient } = require('../services/swisspostClient');
const { puppeteer, getLaunchOptions } = require('../helpers/puppeteer.helpers');
const { puppeteerSemaphore } = require('../helpers/concurrency');
const bcrypt = require('bcryptjs');
const keccak256 = require('keccak256')
const serieController = require('./serie.controller');
const storageUpload = require('../middlewares/storageUpload');
const Sketch = require('../models/sketch.model');
const Whitelist = require('../models/whitelist.model');

const stripe = require("stripe")('sk_test_51INl1iHxwzCEp0yUOSY7MHhyKuXu0IHD8Q4IIkLmDJBbV1FUa6B3JORUxpEiLvvCOtNFgx3VPqudTlcxKZ23Tsdq00ul7qZ5PA');
const logger = require('../utils/logger');

const BASE_URL = process.env.BASE_URL;
const STORAGE_URL = process.env.STORAGE_URL;

const SWISSPOST_API_URL = process.env.SWISSPOST_API_URL;
const SWISSPOST_API_KEY = process.env.SWISSPOST_API_KEY;
const SWISSPOST_API_KEY_HEADER = process.env.SWISSPOST_API_KEY_HEADER || 'X-Apim-Api-Key';
const SWISSPOST_API_CLIENT_ID = process.env.SWISSPOST_API_CLIENT_ID || '';
const SWISSPOST_API_CLIENT_SECRET = process.env.SWISSPOST_API_CLIENT_SECRET || '';
const SWISSPOST_COUNTRIES_PATH = process.env.SWISSPOST_COUNTRIES_PATH || '/countries';
const SWISSPOST_PRODUCTS_PATH = process.env.SWISSPOST_PRODUCTS_PATH || '/products';
const SWISSPOST_ADDRESS_API_URL = process.env.SWISSPOST_ADDRESS_API_URL || SWISSPOST_API_URL;
const SWISSPOST_ADDRESS_API_KEY = process.env.SWISSPOST_ADDRESS_API_KEY || SWISSPOST_API_KEY;
const SWISSPOST_ADDRESS_API_KEY_HEADER = process.env.SWISSPOST_ADDRESS_API_KEY_HEADER || SWISSPOST_API_KEY_HEADER;
const SWISSPOST_ADDRESS_API_CLIENT_ID = process.env.SWISSPOST_ADDRESS_API_CLIENT_ID || SWISSPOST_API_CLIENT_ID;
const SWISSPOST_ADDRESS_API_CLIENT_SECRET = process.env.SWISSPOST_ADDRESS_API_CLIENT_SECRET || SWISSPOST_API_CLIENT_SECRET;
const SWISSPOST_ADDRESS_VALIDATE_PATH = process.env.SWISSPOST_ADDRESS_VALIDATE_PATH || '/addresses/validate';

const spClient = (SWISSPOST_API_URL && SWISSPOST_API_KEY)
  ? new SwissPostClient({ baseURL: SWISSPOST_API_URL, apiKey: SWISSPOST_API_KEY, apiKeyHeader: SWISSPOST_API_KEY_HEADER, apiClientId: SWISSPOST_API_CLIENT_ID, apiClientSecret: SWISSPOST_API_CLIENT_SECRET, countriesPath: SWISSPOST_COUNTRIES_PATH, productsPath: SWISSPOST_PRODUCTS_PATH, paramMap: {
    isoCode: process.env.SWISSPOST_PARAM_COUNTRY || 'isoCode',
    format: process.env.SWISSPOST_PARAM_FORMAT || 'format',
    weight: process.env.SWISSPOST_PARAM_WEIGHT || 'weight',
    lang: process.env.SWISSPOST_PARAM_LANG || 'lang',
    fields: process.env.SWISSPOST_PARAM_FIELDS || 'fields'
  } })
  : null;
const spAddress = (SWISSPOST_ADDRESS_API_URL && SWISSPOST_ADDRESS_API_KEY)
  ? new SwissPostAddressClient({ baseURL: SWISSPOST_ADDRESS_API_URL, apiKey: SWISSPOST_ADDRESS_API_KEY, apiKeyHeader: SWISSPOST_ADDRESS_API_KEY_HEADER, apiClientId: SWISSPOST_ADDRESS_API_CLIENT_ID, apiClientSecret: SWISSPOST_ADDRESS_API_CLIENT_SECRET, validatePath: SWISSPOST_ADDRESS_VALIDATE_PATH })
  : null;

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

    res.status(200).send({ ok: true, data: { clientSecret: paymentIntent.client_secret }, reqId: req.context && req.context.id });

};

let countriesCache = { data: null, ts: 0 };
const COUNTRIES_TTL_MS = Number(process.env.SWISSPOST_COUNTRIES_TTL_MS || 6 * 60 * 60 * 1000); // 6h default

const getCountryList = async () => {
    if (!spClient) return [];
    const now = Date.now();
    if (countriesCache.data && (now - countriesCache.ts < COUNTRIES_TTL_MS)) {
        return countriesCache.data;
    }
    // Mock mode for local dev
    if (process.env.SWISSPOST_MOCK === '1') {
        const list = [
            { isoCode: 'CH', displayName: 'Switzerland' },
            { isoCode: 'DE', displayName: 'Germany' },
            { isoCode: 'FR', displayName: 'France' },
            { isoCode: 'US', displayName: 'United States' }
        ];
        countriesCache = { data: list, ts: now };
        return list;
    }
    const list = await spClient.getCountries({ lang: 'en' });
    countriesCache = { data: list, ts: now };
    return list;
};

exports.getCountryList = async (req, res) => {
    try {
        const countries = await getCountryList();
        res.status(200).send({ ok: true, data: { countries }, reqId: req.context && req.context.id });
    } catch (err) {
        logger.error('swisspost_countries_error', { err: String(err), reqId: req.context && req.context.id });
        res.status(502).send({ ok: false, error: 'countries_fetch_failed', reqId: req.context && req.context.id });
    }
};

exports.getCountryInfo = async (req, res) => {
    try {
        const countryIsoCode = (req.params.code || '').toUpperCase();
        const format = String(req.query.format || '').toUpperCase();
        // Swiss Post products often expect grams as integer
        const weightNum = Math.ceil(Number(req.query.weight));

        if (!countryIsoCode || !/^[A-Z]{2}$/.test(countryIsoCode)) {
            return res.status(400).send({ ok: false, error: 'invalid_country_code', reqId: req.context && req.context.id });
        }
        if (!format) {
            return res.status(400).send({ ok: false, error: 'invalid_format', reqId: req.context && req.context.id });
        }
        if (!Number.isFinite(weightNum) || weightNum <= 0) {
            return res.status(400).send({ ok: false, error: 'invalid_weight', reqId: req.context && req.context.id });
        }

        if (!spClient && process.env.SWISSPOST_MOCK !== '1') {
            return res.status(503).send({ ok: false, error: 'swisspost_unconfigured', reqId: req.context && req.context.id });
        }
        let countryInfo = null;
        if (process.env.SWISSPOST_MOCK === '1') {
            // Synthesize a few products
            const base = 9.0 + (countryIsoCode === 'US' ? 6 : countryIsoCode === 'DE' ? 2 : 0);
            const weightFactor = Math.ceil(weightNum / 250) * 2;
            const products = [
                { code: 'PRI', name: 'Priority', price: base + weightFactor, currency: 'CHF', estimatedDays: countryIsoCode === 'CH' ? 1 : 3 },
                { code: 'ECO', name: 'Economy', price: base - 2 + weightFactor * 0.8, currency: 'CHF', estimatedDays: countryIsoCode === 'CH' ? 2 : 5 }
            ];
            countryInfo = { products };
        } else {
            countryInfo = await spClient.getProducts({ isoCode: countryIsoCode, format, weight: weightNum });
        }
        // Attempt normalization if recognizable structures are present
        let normalized = null;
        try {
            const list = Array.isArray(countryInfo?.products) ? countryInfo.products
              : Array.isArray(countryInfo?.offers) ? countryInfo.offers
              : Array.isArray(countryInfo?.items) ? countryInfo.items : null;
            if (list) {
                normalized = {
                    products: list.map((p) => ({
                        code: p.code || p.id || p.productCode || null,
                        name: p.name || p.productName || null,
                        price: (p.price && (p.price.amount || p.price.value)) || p.amount || p.gross || p.price || null,
                        currency: (p.price && p.price.currency) || p.currency || 'CHF',
                        estimatedDays: p.estimatedDays || p.deliveryDays || null,
                        estimatedDate: p.estimatedDate || p.deliveryDate || null,
                    }))
                };
            }
        } catch (_) {}
        res.status(200).send({ ok: true, data: { countryInfo, normalized }, reqId: req.context && req.context.id });
    } catch (err) {
        logger.error('swisspost_products_error', { err: String(err), reqId: req.context && req.context.id });
        const status = err?.response?.status;
        if (status === 400) {
            return res.status(400).send({ ok: false, error: 'bad_request', details: err?.response?.data || null, reqId: req.context && req.context.id });
        }
        res.status(502).send({ ok: false, error: 'products_fetch_failed', reqId: req.context && req.context.id });
    }
};

exports.validateAddress = async (req, res) => {
    try {
        const { street, zip, city, countryIso2 } = req.body || {};
        if (!street || !zip || !city || !countryIso2) {
            return res.status(400).send({ ok: false, error: 'missing_fields', reqId: req.context && req.context.id });
        }
        if (!spAddress && process.env.SWISSPOST_MOCK !== '1') {
            return res.status(503).send({ ok: false, error: 'address_api_unconfigured', reqId: req.context && req.context.id });
        }
        let validation = null;
        if (process.env.SWISSPOST_MOCK === '1') {
            const ok = Boolean(street && zip && city && countryIso2);
            validation = { ok, score: ok ? 0.98 : 0.0, suggestion: ok ? { street, zip, city, countryIso2: String(countryIso2).toUpperCase() } : null };
        } else {
            validation = await spAddress.validateAddress({ street, zip, city, countryIso2: String(countryIso2).toUpperCase() });
        }
        res.status(200).send({ ok: true, data: { validation }, reqId: req.context && req.context.id });
    } catch (err) {
        logger.error('swisspost_address_validate_error', { err: String(err), reqId: req.context && req.context.id });
        const status = err?.response?.status;
        if (status === 400) {
            return res.status(400).send({ ok: false, error: 'bad_request', details: err?.response?.data || null, reqId: req.context && req.context.id });
        }
        res.status(502).send({ ok: false, error: 'address_validate_failed', reqId: req.context && req.context.id });
    }
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
        logger.error('country_code_error_fetch', { err: String(error), reqId: req && req.context && req.context.id })
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
            res.status(200).send({ ok: true, data: { countryCode: data.address.country_code.toUpperCase() }, reqId: req.context && req.context.id });
        } else {
            throw new Error('Country code not found');
        }
    } catch (error) {
        logger.error('country_code_error_fetch', { err: String(error), reqId: req && req.context && req.context.id });
        res.status(500).send({ ok: false, error: 'country_code_error', reqId: req.context && req.context.id });
    }
};

exports.calculatePaperWeight = async (req, res) => {
    const width = Number(req.query.width);
    const height = Number(req.query.height);
    const thick = Number(req.query.thick);
    const density = Number(req.query.density); // g/m2

    if (![width, height, thick, density].every(Number.isFinite)) {
        return res.status(400).send({ ok: false, error: 'invalid_dimensions', reqId: req.context && req.context.id });
    }

    // convert density from g/cm2 to g/mm2
    const density_mm2 = density / 1000000;

    const volume = width * height * thick;
    const weight = volume * density_mm2;

    res.status(200).send({ ok: true, data: { weight }, reqId: req.context && req.context.id });
};

// get photo paper price depending on the size, thickness and density
exports.getPaperPrintPrice = async (req, res) => {
    const width = Number(req.query.width);
    const height = Number(req.query.height);
    const thick = Number(req.query.thick);
    const density = Number(req.query.density) * 100; // g/cm3 to g/mm3

    if (![width, height, thick, density].every(Number.isFinite)) {
        return res.status(400).send({ ok: false, error: 'invalid_dimensions', reqId: req.context && req.context.id });
    }

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




    res.status(200).send({ ok: true, data: { price: finalPrice.toFixed(2) }, reqId: req.context && req.context.id });

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
        return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'order_not_found' }, reqId: req.context && req.context.id });
    }

    const identifierValid = bcrypt.compareSync(identifier, order.identifier);

    if (!identifierValid) {
        return res.status(401).send({ ok: false, error: { code: 'unauthorized', message: 'invalid_identifier' }, reqId: req.context && req.context.id });
    }

    if (!order.paid) {
        return res.status(400).send({ ok: false, error: { code: 'order_unpaid', message: 'order_not_paid' }, reqId: req.context && req.context.id });
    }

    if (artworkValue !== order.artworkValue || printValue !== order.printValue || transportValue !== order.transportValue) {
        return res.status(400).send({ ok: false, error: { code: 'values_mismatch', message: 'values_mismatch' }, reqId: req.context && req.context.id });
    }

    const orderTotalValue = order.artworkValue + order.printValue + order.transportValue;

    if (amount !== orderTotalValue) {
        return res.status(400).send({ ok: false, error: { code: 'amount_mismatch', message: 'amount_mismatch' }, reqId: req.context && req.context.id });
    }

    Serie.findById(serieId)
        .populate('sketch')
        .populate('whitelist')
        .exec(async (err, serie) => {
            if (err) {
                return res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(err) }, reqId: req.context && req.context.id });
            }

            if (!serie) {
                return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'serie_not_found' }, reqId: req.context && req.context.id });
            }

            if (!serie.onSale) {
                return res.status(400).send({ ok: false, error: { code: 'not_on_sale', message: 'serie_not_on_sale' }, reqId: req.context && req.context.id });
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
                        res.status(409).send({ ok: false, error: { code: 'sold_out', message: 'serie_sold_out' }, reqId: req.context && req.context.id });
                        return;
                    }
                }
            } else {
                if (serie.supply >= serie.totalSupply) {
                    serie.onSale = false;
                    await serie.save();
                    res.status(409).send({ ok: false, error: { code: 'sold_out', message: 'serie_sold_out' }, reqId: req.context && req.context.id });
                    return;
                }
            }

            const fileUrl = serie.sketch.url;

            if (!fileUrl || fileUrl === '') {
                return res.status(404).send({ ok: false, error: { code: 'not_found', message: 'file_not_found' }, reqId: req.context && req.context.id });
            }

            const fetchUrl = STORAGE_URL + fileUrl;
            const rsp = await axios.get(fetchUrl);
            const fileContent = rsp.data;

            const iteration = serie.supply + 1;

            const { hashedHtmlContent, hash } = await generateIframe(iteration, serieId, fileContent);

            const contentUrl =
                await storageUpload.uploadStoragePrint(hashedHtmlContent, userId, serieId, hash);

            const traits = await getAttributes(hashedHtmlContent, contentUrl);

            logger.info('attributes_extracted', { count: traits && traits.length })
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
                origin: 'print'
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
            res.status(200).send({ ok: true, data: {
                id: element._id,
                serieId: serieId,
                serie: {
                    id: serie._id,
                    onSale: serie.onSale,
                    supply: serie.supply,
                    volumeUSD: serie.volumeUSD,
                }
            }, reqId: req.context && req.context.id });

            order.generated = true;
            await order.save();
        })
        .catch((err) => {
            res.status(500).send({ ok: false, error: { code: 'internal_error', message: String(err) }, reqId: req.context && req.context.id });
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
        const release = await puppeteerSemaphore.acquire();
        const browser = await puppeteer.launch(getLaunchOptions());
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
        release();

        return traits;
    } catch (err) {
        logger.error('generate_iframe_error', { err: String(err) })
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
            logger.error('mail_send_error', { err: String(err) })
        } else {
            logger.info('mail_sent', { info })
        }
    });
}
