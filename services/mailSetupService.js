// services/mailService.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const appCypherConfig = require("../config/app.cypher.config");
const { SPECTRA_EMAIL, MAIL_HOST, MAIL_PORT, MAIL_PASSWORD } = appCypherConfig;

const transporter = nodemailer.createTransport({
  host: 'mail.infomaniak.com',
    port: 465,
    secure: true,
    auth: {
        user: 'artist@spectra.gallery',
        pass: process.env.MAIL_PASSWORD
    }
});

/**
 * Sends an email using the configured transporter.
 *
 * @param {Object} mailOptions - The options for the email to send.
 * @param {string} mailOptions.from - The email address to send the email from.
 * @param {string} mailOptions.to - The email address to send the email to.
 * @param {string} mailOptions.subject - The subject of the email.
 * @param {string} mailOptions.text - The plain text body of the email.
 * @param {string} [mailOptions.html] - The HTML body of the email.
 */
async function sendMail(mailOptions) {
  /*
    let info = await transporter.sendMail(mailOptions);
    //console.log('Message sent: %s', info.messageId);
    return info;*/

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
}

/**
async function sendSetupEmail(email, setupUrl) {
  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT) || 465,
    secure: true,
    auth: {
      user: SPECTRA_EMAIL,
      pass: MAIL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: '"artist@spectra.gallery',
    to: email,
    subject: "YubiKey Setup",
    html: `Hello!\n\nPlease click the link to set up your YubiKey:\n\n${setupUrl}\n`,
  });

  console.log("[MailService] Email messageId:", info.messageId);
}

**/
async function sendSetupEmail(email, setupUrl) {

  const mailOptions = {
    
      from: '"artist@spectra.gallery',
      to: email,
      subject: "YubiKey Setup",
      html: `Hello!\n\nPlease click the link to set up your YubiKey:\n\n${setupUrl}\n`,
    }

  await sendMail(mailOptions);

  console.log("[MailService] Email sent to:", email);
}

async function sudoAccessSetup(email, setupUrl) {
  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT) || 465,
    secure: false,
    auth: {
      user: SPECTRA_EMAIL,
      pass: MAIL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: '"My Secure Service" <noreply@myservice.com>',
    to: email,
    subject: "YubiKey Setup",
    text: `Hello!\n\nPlease click the link to set up your YubiKey:\n\n${setupUrl}\n`,
  });

  console.log("[MailService] Email messageId:", info.messageId);
}

module.exports = { sendSetupEmail, sudoAccessSetup  };