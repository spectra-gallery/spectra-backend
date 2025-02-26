const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();

const appCypherConfig = require('./config/app.cypher.config');

require('dotenv').config();

const CLIENT_URL = appCypherConfig.CLIENT_URL;
const STORAGE_API_URL = appCypherConfig.STORAGE_API_URL;

global.__basedir = __dirname;


const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:6001'],
};

app.use(cors(corsOptions));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));


app.use(express.static(path.join(__dirname, 'ressources'),
    {xframe: 'ALLOW-FROM *'}));


app.get('/', (req, res) => {
  res.json({message: 'Spectra API'});
});

require('./routes/auth.routes')(app);
require('./routes/sudo.routes')(app);
require('./routes/app.auth.routes')(app);
require('./routes/storage.auth.routes')(app);
require('./routes/data.routes')(app);
require('./routes/serie.routes')(app);
require('./routes/article.routes')(app);
require('./routes/playground.routes')(app);
require('./routes/user.routes')(app);
require('./routes/wallet.routes')(app);
require('./routes/dao.routes')(app);
require('./routes/gallery.routes')(app);
require('./routes/exhibition.routes')(app);
require('./routes/blog.routes')(app);
require('./routes/portfolio.routes')(app);
require('./routes/generative.routes')(app);
require('./routes/lab.routes')(app);
require('./routes/print.routes')(app);

// require('./routes/social.routes')(app);


const PORT = appCypherConfig.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});

const db = require('./models');
const Role = db.role;

const dbConfig = require('./config/db.config');

db.mongoose
    .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    })
    .then(() => {
      console.log('Successfully connect to MongoDB.');
      initial();
    })
    .catch((err) => {
      console.error('Connection error', err);
      process.exit();
    });

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: 'user',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'user\' to roles collection');
      });

      new Role({
        name: 'admin',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'admin\' to roles collection');
      });

      new Role({
        name: 'creator',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'creator\' to roles collection');
      });

      new Role({
        name: 'thinker',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'thinker\' to roles collection');
      });

      new Role({
        name: 'myself',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'myself\' to roles collection');
      });
    }
  });
}
