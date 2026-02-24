// const wallet = require('../controllers/wallet.controller.js');
// const ordinal = require('../controllers/ordinal.controller.js');
// const discord = require('../middlewares/discord');
const inscribe = require('../controllers/inscribe.controller.js');
require('dotenv').config();
const db = require('../models');

const dbConfig = require('../config/db.config');

db.mongoose
    .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('Successfully connect to MongoDB.');
      // initial();
    })
    .catch((err) => {
      console.error('Connection error', err);
      process.exit();
    })
    .then(() => {
      /*
      inscribe.createInscription('65bab81c802f6e5035ee27dc', '0x1234', 'bc1pn0lu250m43pgevcdfkm879k9k65dss3kpps7ftppx6zduqqdq86q7g35p8', 20, 'COMMON')
          .then((result) => {
            console.log(result);
          })
          .catch((err) => {
            console.error(err);
          });
*/

      /*
      inscribe.getInscriptionPrices(17000, 40)
          .then((result) => {
            console.log(result);
          })
          .catch((err) => {
            console.error(err);
          });
          */
      /*
      inscribe.getRareSatInventory()
          .then((result) => {
            console.log(result);
          },
          )
          .catch((err) => {
            console.error(err);
          });
          */

      inscribe.getOrdinalsBotInscriptionStatus('624bb703-829b-435c-92fc-cbad3610186e')
          .then((result) => {
            console.log(result);
          },

          )
          .catch((err) => {
            console.error(err);
          });
    });
