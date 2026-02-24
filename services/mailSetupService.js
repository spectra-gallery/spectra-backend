// services/mailService.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const MAIL_HOST = process.env.MAIL_HOST || 'mail.infomaniak.com'
const MAIL_PORT = Number(process.env.MAIL_PORT || 465)
const MAIL_SECURE = typeof process.env.MAIL_SECURE !== 'undefined' ? String(process.env.MAIL_SECURE).toLowerCase() === 'true' : MAIL_PORT === 465
const MAIL_USER = process.env.MAIL_USER || 'artist@spectra.gallery'
const MAIL_PASSWORD = process.env.MAIL_PASSWORD

let transporter = null
function getTransporter () {
  if (transporter) return transporter
  if (!MAIL_PASSWORD) {
    console.warn('[MailSetup] MAIL_PASSWORD not set; email sending disabled')
    return null
  }
  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_SECURE,
    auth: { user: MAIL_USER, pass: MAIL_PASSWORD }
  })
  return transporter
}

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

  const tx = getTransporter()
  if (!tx) { console.warn('[MailSetup] Skipping send (no transporter)'); return }
  tx.sendMail(mailOptions, (err, info) => {
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
async function sendSetupEmail (email, setupUrl) {
  const mailOptions = { from: MAIL_USER, to: email, subject: 'YubiKey Setup', html: `Hello!<br><br>Please click the link to set up your YubiKey:<br><br><a href="${setupUrl}">${setupUrl}</a>` }
  await sendMail(mailOptions)
  console.log('[MailService] Email sent to:', email)
}

async function sudoAccessSetup (email, setupUrl) {
  const tx = getTransporter()
  if (!tx) return
  const info = await tx.sendMail({ from: MAIL_USER, to: email, subject: 'YubiKey Setup', text: `Hello!\n\nPlease click the link to set up your YubiKey:\n\n${setupUrl}\n` })
  console.log('[MailService] Email messageId:', info.messageId)
}

module.exports = { sendSetupEmail, sudoAccessSetup  };
