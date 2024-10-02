const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

require('dotenv').config();

const BASE_URL = process.env.STORAGE_URL;

const parseHTML = async (htmlString) => {

     // Create a DOM instance from the HTML string
     const dom = new JSDOM(htmlString);
     const document = dom.window.document;
 
     // Extract CSS from all <style> tags
     let cssContent = '';
     const styleTags = document.querySelectorAll('style');
     styleTags.forEach(style => {
         cssContent += style.textContent + '\n';
         style.remove(); // Remove the <style> tag from the DOM
     });
 
     // Extract JavaScript from all <script> tags
     let jsContent = '';
     const scriptTags = document.querySelectorAll('script');
     scriptTags.forEach(script => {
         jsContent += script.textContent + '\n';
         script.remove(); // Remove the <script> tag from the DOM
     });
 
     // Get the remaining HTML content
     const pureHtmlContent = document.documentElement.outerHTML;
 
     // Return the parsed content
     return {
         html: pureHtmlContent,
         css: cssContent,
         js: jsContent
     };
    
    /*
    const fileUrl = BASE_URL + filePath;

    // Launch puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Load the HTML file into the page
    await page.goto(fileUrl);

    // Extract CSS from all <style> tags
    const cssContent = await page.evaluate(() => {
        let styles = Array.from(document.querySelectorAll('style'));
        return styles.map(style => style.textContent).join('\n');
    });

    // Extract JavaScript from all <script> tags
    const jsContent = await page.evaluate(() => {
        let scripts = Array.from(document.querySelectorAll('script'));
        return scripts.map(script => script.textContent).join('\n');
    });

    // Extract the HTML content without <style> and <script> tags
    const pureHtmlContent = await page.evaluate(() => {
        // Remove <style> and <script> tags
        document.querySelectorAll('style, script').forEach(el => el.remove());
        return document.documentElement.outerHTML;
    });

    // Close the browser
    await browser.close();

    // Return the parsed content
    return {
        html: pureHtmlContent,
        css: cssContent,
        js: jsContent
    };
    */
}

module.exports = parseHTML;