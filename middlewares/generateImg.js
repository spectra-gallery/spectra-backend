const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.STORAGE_URL;

generateImg = async (req, res) => {
  // parse the formData with multer to get the file
  const urlDoc = BASE_URL + req.body.url;
  const captureDelay = req.body.delay;
  const cssSelector = req.body.cssSelector;
  /*
  const userId = req.userId;
  const slug = req.body.slug;
  */


  urlToPng(urlDoc, captureDelay, cssSelector)
      .then((imageBuffer) => {
        const name = Date.now();
        fs.writeFileSync(`./ressources/api/inscriptions/${name}.png`,
            imageBuffer);

        // conver imageBuffer to base64 string
        // const base64Image = imageBuffer.toString('base64');

        // send base64 string to client
        // res.status(200).send(base64Image);


        res.status(200).send(`${BASE_URL}api/inscriptions/${name}.png`);
      })
      .catch((error) => {
        console.error(error);
      });
};

/**
 * Converts a webpage to a PNG image.
 *
 * @param {string} url - The URL of the webpage to convert.
 * @param {number} delayTime -
 * The delay before taking the screenshot, in milliseconds.
 * @param {string} cssSelector - The CSS selector to use to select the element
 * @return {Promise<void>}
 * A promise that resolves when the screenshot has been taken.
 */
async function urlToPng(url, delayTime=5000, cssSelector='body') {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();


  // proxy requests to ordinals endpoints
  await page.setRequestInterception(true);

  /*
  page.on('request', (request) => {
    // proxy requests containing /content/ to https://ordinals.com without the header
    // and requests containing /r/ to https://ordinals.com without the header
    if (request.url().includes('/content/')) {
      request.continue({
        url: request.url().replace(BASE_URL, 'https://ordinals.com/'),
        headers: request.headers(),
      });
    } else {
      request.continue();
    }
  });
  */

  page.on('request', (request) => {
    // Check if the request URL contains /content/
    if (request.url().includes('/content/')) {
      const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
      request.continue({
        url: newUrl,
        headers: request.headers(),
      });
    } else if (request.url().includes('/blockhash/')) {
      const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
      request.continue({
        url: newUrl,
        headers: request.headers(),
      });
    } else if (request.url().includes('/blockheight/')) {
      const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
      request.continue({
        url: newUrl,
        headers: request.headers(),
      });
    } else if (request.url().includes('/r/')) {
      const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
      request.continue({
        url: newUrl,
        headers: request.headers(),
      });
    } else {
      request.continue();
    }
  });


  await page.setViewport({
    width: 800,
    height: 800,
    deviceScaleFactor: 1,
  });

  await page.goto(url, {waitUntil: 'load'});

  let imageBuffer;

  if (cssSelector === 'body') {
    await delay(delayTime);
    imageBuffer = await page.screenshot({
      type: 'png',
    });
  } else {
    const example = await page.$(cssSelector) ||
  await page.$('canvas') ||
  await page.$('svg') ||
  await page.$('.container') ||
  await page.$('body');
    const boundingBox = await example.boundingBox();

    await delay(delayTime);
    imageBuffer = await page.screenshot({type: 'png',
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: Math.min(boundingBox.width, page.viewport().width),
        height: Math.min(boundingBox.height, page.viewport().height),
      }});
  }
  await browser.close();
  return imageBuffer;
}

htmlToPng = async (html) => {
  try {
    // using fs to get html content from file url


    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 800,
      height: 800,
      deviceScaleFactor: 1,
    });
    await page.setContent(html);
    await delay(5000);
    const imageBuffer = await page.screenshot({type: 'png'});
    await browser.close();
    return imageBuffer;


    // return the preview url to generatePreview function
  } catch (error) {
    console.error(error);
    // throw error;
    // Re-throw the error to be caught by the caller of generatePreview
  }
};

/**
 * Generates preview images for the given HTML content.
 *
 * @param {string} htmlContent - The HTML content to generate previews for.
 * @return {Promise<string[]>}
 * A promise that resolves with the URLs of the preview images.
 */
async function generatePreviews(htmlContent) {
  const imageUrls = [];


  for (let i = 0; i < 5; i++) {
    const imageBuffer = await htmlToPng(htmlContent);

    const name = Date.now();
    fs.writeFileSync(`./ressources/api/previews/${name}.png`, imageBuffer);

    imageUrls.push(`${BASE_URL}api/previews/${name}.png`);
  }

  return imageUrls;
}

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


module.exports = {
  generateImg,
  generatePreviews,
};
