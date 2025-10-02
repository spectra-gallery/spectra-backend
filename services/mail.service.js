const nodemailer = require("nodemailer");
require("dotenv").config();
const db = require("../models");
const crypto = require("crypto");
const Token = db.token;
const Auth = db.auth;

const BASE_URL = process.env.BASE_URL;

// configure the mail server infomaniak
const MAIL_HOST = process.env.MAIL_HOST || 'mail.infomaniak.com'
const MAIL_PORT = Number(process.env.MAIL_PORT || 465)
const MAIL_SECURE = typeof process.env.MAIL_SECURE !== 'undefined' ? String(process.env.MAIL_SECURE).toLowerCase() === 'true' : MAIL_PORT === 465
const MAIL_USER = process.env.MAIL_USER || 'artist@spectra.gallery'
const MAIL_PASSWORD = process.env.MAIL_PASSWORD

let transporter = null
function getTransporter () {
  if (transporter) return transporter
  if (!MAIL_PASSWORD) {
    console.warn('[Mail] MAIL_PASSWORD not set; email sending disabled')
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
    if (!tx) { console.warn('[Mail] Skipping send (no transporter)'); return }
    tx.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
  }

/**
 * Sends an authentication email to the user.
 *
 * @async
 * @param {Object} user - The user to send the email to.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @throws Will throw an error if the email cannot be sent.
 */
async function sendAuthenticationEmail(user, req, res) {
  try {
    const obj = generateVerificationToken(user);

    // Save the verification token to database
    const auth = new Auth(obj);
    await auth.save();

    const link = "http://" + req.headers.host + "/api/auth/email/" + auth.token;

    const mailOptions = {
      subject: "Authentication Spectra Gallery",
      to: user.email,
      from: "artist@spectra.gallery",
      html: `
        <html>
    <head>
  
      <title>Spectra Gallery</title>
  
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
  
       body {
         font-family: "Roboto", sans-serif;
         background-color: #f7f0e6;
         color: #1d1d21;
       }
  
       .grid-container {
          display: flex;
          flex-wrap: wrap;  
          padding: 20px;
        }
  
        .item {
          flex: 1 1 calc(50% - 10px);
          margin: 5px;
          padding: 20px;
          box-sizing: border-box;
      }
      p {
        margin-top: 24px;
      }
  
      h4 {
        font-weight: 700;
      }
       
     </style>
    </head>
  
    <body>
      <div class="grid-container">
        <div class="item">
        <h1>Spectra Gallery</h1>
        <h4>Authentication</h4>
        </div>
        <div class="item">
        <p>Welcome ${user.username}!</p>
        </div>
        <div class="item">
        <p>Please click the link below to authenticate</p>
        <h4><a href="${link}">Authenticate ${user.email} now</a></h4>
        </div>
      </div>
    </body>
  </html>
          `,
    };

    await sendMail(mailOptions);

    res.status(200).json({ message: "Processing authentication" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Sends a verification email to the given user.
 *
 * @param {Object} user - The user to send the verification email to.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
async function sendVerificationEmail(user, req, res) {
  try {
    const obj = generateVerificationToken(user);

    // Save the verification token to database
    const token = new Token(obj);
    await token.save();

    const link =
      "http://" + req.headers.host + "/api/auth/verify/" + token.token;

    const mailOptions = {
      subject: "Email Verification Spectra Gallery",
      to: user.email,
      from: "artist@spectra.gallery",
      html: `
        <html>
   <head>
     <title>Spectra Gallery</title>
     <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
  
       body {
         font-family: "Roboto", sans-serif;
         background-color: #f7f0e6;
         color: #1d1d21;
       }
  
       .grid-container {
          display: flex;
          flex-wrap: wrap;  
          padding: 20px;
        }
  
        .item {
          flex: 1 1 calc(50% - 10px);
          margin: 5px;
          padding: 20px;
          box-sizing: border-box;
      }
  
      h4 {
        font-weight: 700;
      }
       
     </style>
   </head>
   <body>
     <br><br>
     <img src="${BASE_URL}icons/spectra.svg" width="200" height="200" alt="Spectra Gallery Logo">
     <div class="grid-container">
        <div class="item">
     <h1>Spectra Gallery</h1>
     <h4>Email Verification</h4><br>
      </div>
      <div class="item">
     <p>
       Welcome ${user.username}!
     </p>
      </div>
      <div class="item">
     <p>Please click the link below to verify your email address:</p>
     <h4><a href="${link}">Verify ${user.email} now</a></h4><br><br>
      </div>
      <div class="item">
        <h3>Thank you for joining Spectra Gallery!</h3>
        <h4>spectra.gallery</h4>
      </div>
     </div>
  
   </body>
  
  </html>
          `,
    };

    await sendMail(mailOptions);
    /*
      res.status(200).json(
          {message: 'Verification email sent to ' + user.email + '.'});
          */
    console.log("Verification email sent to " + user.email + ".");
  } catch (error) {
    console.log(error);
    // res.status(500).json({message: error.message});
  }
}

// recover password email
const sendRecoveryEmail = async (user, req, res) => {
  try {
    const obj = generateVerificationToken(user);

    // Save the verification token to database
    const token = new Token(obj);
    await token.save();

    const link =
      "http://" + req.headers.host + "/api/auth/recover/" + token.token;

    const mailOptions = {
      subject: "Password Recovery Spectra Gallery",
      to: user.email,
      from: "artist@spectra.gallery",
      html: `
        <html>
    <head>
    
        <title>Spectra Gallery</title>
        <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
  
       body {
         font-family: "Roboto", sans-serif;
         background-color: #f7f0e6;
         color: #1d1d21;
       }
  
       .grid-container {
          display: flex;
          flex-wrap: wrap;  
          padding: 20px;
        }
  
        .item {
          flex: 1 1 calc(50% - 10px);
          margin: 5px;
          padding: 20px;
          box-sizing: border-box;
      }
  
      h4 {
        font-weight: 700;
      }
       
     </style>
    </head>
  
    <body>
      <div class="grid-container">
        <div class="item">
        <h1>Spectra Gallery</h1>
        <h4>Password Recovery</h4>
        </div>
        <div class="item">
        <p>Welcome ${user.username}!</p>
        </div>
        <div class="item">
        <p>Please click the link below to recover your password</p>
        <h4><a href="${link}">Recover Password</a></h4>
        </div>
      </div>
  
    </body>
  
  </html>
  
          `,
    };

    await sendMail(mailOptions);

    return true;
  } catch (error) {
    return false;
  }
};

const sendNewPassword = async (user, password, req, res) => {
  try {
    const mailOptions = {
      subject: "New Password Spectra Gallery",
      to: user.email,
      from: "artist@spectra.gallery",
      html: `
        <html>
    <head>
    
          <title>Spectra Gallery</title>
  
          <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
  
       body {
         font-family: "Roboto", sans-serif;
         background-color: #f7f0e6;
         color: #1d1d21;
       }
  
       .grid-container {
          display: flex;
          flex-wrap: wrap;  
          padding: 20px;
        }
  
        .item {
          flex: 1 1 calc(50% - 10px);
          margin: 5px;
          padding: 20px;
          box-sizing: border-box;
      }
  
      h4 {
        font-weight: 700;
      }
       
     </style>
    </head>
  
    <body>
      <div class="grid-container">
        <div class="item">
        <h1>Spectra</h1>
        <h4>New Password</h4>
        </div>
        <div class="item">
        <p>Welcome ${user.username}!</p>
        <p>Your new password is: ${password}</p>
        <p>Please change your password after logging in</p>
        </div>
      </div>
  
    </body>
  
  </html>
  
          `,
    };

    await sendMail(mailOptions);

    return true;
  } catch (error) {
    return false;
  }
};

generateVerificationToken = (user) => {
  const obj = {
    userId: user._id,
    token: crypto.randomBytes(20).toString("hex"),
  };

  return obj;
};

const mail = {
  sendMail,
  // getMailOptions,
  sendVerificationEmail,
  sendAuthenticationEmail,
  sendRecoveryEmail,
  sendNewPassword,
};

module.exports = mail;
