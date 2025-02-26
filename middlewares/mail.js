const nodemailer = require('nodemailer');
require('dotenv').config();
const db = require('../models');
const crypto = require('crypto');
const Token = db.token;
const Auth = db.auth;

const BASE_URL = process.env.BASE_URL;

// configure the mail server infomaniak
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

async function sendSetupEmail(email, setupUrl) {

  const mailOptions = {
    
      from: '"secure@spectra.gallery',
      to: email,
      subject: "YubiKey Setup",
      html: `Hello!\n\nPlease click the link to set up your YubiKey:\n\n${setupUrl}\n`,
    }

  const info = await sendMail(mailOptions);

  console.log("[MailService] Email messageId:", info.messageId);
}

/**
 * Gets the mail options for a given recipient, data, and type.
 *
 * @param {string} to - The email address to send the email to.
 * @param {Object} data - The data to include in the email.
 * @param {string} type - The type of email to send.
 * @return {Object} The mail options.
 */
function getMailOptions(to, data, type) {
  if (type === 'content') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `${data._id} created by ${data.artists[0]}`,
      html: `
        <div style="background-color: #f2f2f2; 
        padding: 20px; border-radius: 10px;">
    
        <h2 style="color: #000;">ID: ${data._id}</h2>
        <div style="color: #000;">Name: ${data.name}</div>
        <div style="color: #000;">Content: ${data.description}</div>
        <div style="color: #000;">Artist: ${data.artists[0]}</div>
        <div style="color: #000;">Supply: ${data.totalSupply}</div>
        <div style="color: #000;">Price: ${data.price}</div>
        <div style="color: #000;">OnSale: ${data.onSale}</div>
        <img src="${data.image}" alt="image" 
        style="width: 100%; height: auto;"/>
    
        </div>
        `,
    };
  } else if (type === 'newUser') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `New User - ${data.username}`,
      html: `
        <div style="background-color: #f2f2f2; 
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000; text-align: center;">Username: 
        ${data.username}</h2>
        <div style="color: #000; text-align: center;">Ordinal:
        ${data.ordinalAddress}</div>
        <div style="color: #000; text-align: center;">Cardinal:
        ${data.cardinalAddress}</div>

        </div>
        `,
    };
  } else if (type === 'inscription') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Inscription - ${data.identifier}`,
      html: `
        <div style="background-color: #f2f2f2; 
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Collection ID: ${data._id}</h2>
        <div style="color: #000;
        text-align: center;">Inscription ID: ${data.txId}</div>
        <div style="color: #000;
        text-align: center;">Satscribe ID: ${data.identifier}</div>
        <div style="color: #000;
        text-align: center;">Amount: ${data.amount}</div>
        <div style="color: #000;
        text-align: center;">Fees: ${data.fees}</div>
        <div style="color: #000;
        text-align: center;">Receptacle Address: ${data.fundingAddress}</div>
        <div style="color: #000;
        text-align: center;">Funding Address: ${data.userAddress}</div>
        <div style="color: #000;
        text-align: center;">Awaiting Funding: ${data.isAwaitingFunding}</div>
        <div style="color: #000;
        text-align: center;">Awaiting Ordinal: ${data.isAwaitingOrdinal}</div>
        <div style="color: #000;
        text-align: center;">
        Awaiting Confirmation: ${data.isAwaitingConfirmation}</div>
        <div style="color: #000;
        text-align: center;">is Confirmed: ${data.isConfirmed}</div>
        <div style="color: #000;
        text-align: center;">has failed: ${data.hasFailed}</div>

        </div>
        `,
    };
  } else if (type === 'autoPay') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `AutoPay - ${data.txHash}`,
      html: `
        <div style="background-color: #f2f2f2; 
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000; 
        text-align: center;">TX HASH: ${data.txHash}</h2>
        <div style="color: #000;
        text-align: center;">Amount: ${data.value}</div>

        </div>
        `,
    };
  } else if (type === 'transaction') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Transaction - ${data.txHash}`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">TX HASH: ${data.txHash}</h2>
        <div style="color: #000; text-align: center;">Valid: ${data.valid}</div>

        </div>
        `,
    };
  } else if (type === 'walletSwitch') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Wallet Switch - ${data.id}`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000; text-align: center;">Wallet ID: ${data.id}</h2>
        <div style="color: #000;
        text-align: center;">Wallet Balance: ${data.balance}</div>

        </div>
        `,
    };
  } else if (type === 'bid') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Bid - ${data.tokenId}`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Token ID: ${data.tokenId}</h2>
        <div style="color: #000;
        text-align: center;">Bidder: ${data.bidderOrdinalAddress}</div>
        <div style="color: #000;
        text-align: center;">Bid Value: ${data.amount} satoshis</div>

        </div>
        `,
    };
  } else if (type === 'whitelist') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Whitelist - ${data._doc.username}`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Username: ${data._doc.username}</h2>
        <div style="color: #000;
        text-align: center;">Whitelisting Address: 
        ${data.whitelistAddress}</div>
        <div style="color: #000;
        text-align: center;">User Address: ${data._doc.address}</div>

        </div>
        `,
    };
  } else if (type === 'application') {
    return {
      from: 'artist@spectra.gallery',
      to: 'pmosi76@gmail.com',
      subject: `User: ${data._doc.username}, applied as Creator`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Username: ${data._doc.username}</h2>   
        <div style="color: #000;
        text-align: center;">Application ID: ${data._doc._id}</div>  
        <div style="color: #000;
        text-align: center;">User ID: ${data._doc.id}</div>
        <div style="color: #000;
        text-align: center;">Email: ${data._doc.email}</div>
        <div style="color: #000;
        text-align: center;">Address: ${data._doc.address}</div>
        <div style="color: #000;
        text-align: center;">Website: ${data._doc.website}</div>
        <div style="color: #000;
        text-align: center;">Twitter: ${data._doc.twitter}</div>
        <div style="color: #000;
        text-align: center;">Description: ${data._doc.description}</div>

        </div>
        `,
    };
  } else if (type === 'secret') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Secret Key`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Secret: ${data}</h2>

        </div>
        `,
    };
  } else if (type === 'adminLogin') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Admin Login - ${data.username}`,
      html: `
        <div style="background-color: #f2f2f2; 
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000; text-align: center;">Username: 
        ${data.username}</h2>
        <div style="color: #000; text-align: center;">Ordinal:
        ${data.ordinalAddress}</div>
        <div style="color: #000; text-align: center;">Cardinal:
        ${data.cardinalAddress}</div>

        </div>
        `,
    };
  } else if (type === 'u2f') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Secret Key`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Secret: ${data}</h2>

        </div>
        `,
    };
  } else if (type === 'error') {
    return {
      from: 'artist@spectra.gallery',
      to: to,
      subject: `Error`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Error: ${data}</h2>

        </div>
        `,
    };
  } else if (type === 'apply_granted') {
    return {
      from: 'artist@spectra.gallery',
      to: 'pmosi76@gmail.com',
      subject: `User: ${data._doc.username}, Application Granted`,
      html: `
        <div style="background-color: #f2f2f2;
        padding: 20px; border-radius: 10px;">

        <h2 style="color: #000;
        text-align: center;">Username: ${data._doc.username}</h2>   
        <div style="color: #000;
        text-align: center;">Application ID: ${data._doc._id}</div>  
        <div style="color: #000;
        text-align: center;">User ID: ${data._doc.id}</div>
        <div style="color: #000;
        text-align: center;">Email: ${data._doc.email}</div>
        <div style="color: #000;
        text-align: center;">Address: ${data._doc.address}</div>
        <div style="color: #000;
        text-align: center;">Website: ${data._doc.website}</div>
        <div style="color: #000;
        text-align: center;">Twitter: ${data._doc.twitter}</div>
        <div style="color: #000;
        text-align: center;">Description: ${data._doc.description}</div>

        </div>
        `,
    };
  }
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

    const link = 'http://' + req.headers.host + '/api/auth/email/' + auth.token;

    const mailOptions = {
      subject: 'Authentication Spectra Gallery',
      to: user.email,
      from: 'artist@spectra.gallery',
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

    res.status(200).json(
        {message: 'Processing authentication'});
  } catch (error) {
    res.status(500).json({message: error.message});
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

    const link = 'http://' + req.headers.host + '/api/auth/verify/' + token.token;

    const mailOptions = {
      subject: 'Email Verification Spectra Gallery',
      to: user.email,
      from: 'artist@spectra.gallery',
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
       console.log('Verification email sent to ' + user.email + '.');
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

    const link = 'http://' + req.headers.host + '/api/auth/recover/' + token.token;

    const mailOptions = {
      subject: 'Password Recovery Spectra Gallery',
      to: user.email,
      from: 'artist@spectra.gallery',
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
  }
  catch (error) {
    return false;
  }
}

// send user the new password
const sendNewPassword = async (user, password, req, res) => {
  try {
    const mailOptions = {
      subject: 'New Password Spectra Gallery',
      to: user.email,
      from: 'artist@spectra.gallery',
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
  }
  catch (error) {
    return false;
  }
}


generateVerificationToken = (user) => {
  const obj = {
    userId: user._id,
    token: crypto.randomBytes(20).toString('hex'),
  };

  return obj;
};


const mail = {
  sendMail,
  getMailOptions,
  sendVerificationEmail,
  sendAuthenticationEmail,
  sendRecoveryEmail,
  sendNewPassword,
};
module.exports = mail;
