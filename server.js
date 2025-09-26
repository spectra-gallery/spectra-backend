const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose  = require('mongoose');

const app = express();

/*
const { Server } = require('socket.io');
const Quaternion = require('quaternion');
*/

const ServerInit = require('./utils/ServerInit');
const initial = ServerInit;

const appCypherConfig = require('./config/app.cypher.config');
const dbConfig  = require('./config/db.config');
const requestContext = require('./middlewares/requestContext');
const errorHandler = require('./middlewares/errorHandler');
const { ConnectionMonitor } = require('./services/connectionMonitor');

require('dotenv').config();

const CLIENT_URL = appCypherConfig.CLIENT_URL;
const STORAGE_API_URL = appCypherConfig.STORAGE_API_URL;

global.__basedir = __dirname;


const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:6601'],
};

app.use(cors(corsOptions));

// request tracing
app.use(requestContext);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

/*
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000' } });
*/

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
require('./routes/health.routes')(app);
require('./routes/ordinal.routes')(app);
require('./routes/monitor.routes')(app);
require('./routes/timeline.routes')(app);
require('./routes/telemetry.routes')(app);
require('./routes/draft.routes')(app);

// global error handler (keep last)
app.use(errorHandler);

// require('./routes/social.routes')(app);
/*
function quantumEncrypt(url) {
  const encoded = Buffer.from(url).toString('hex');
  const quaternions = [];

  for (let i = 0; i < encoded.length; i += 4) {
    const chunk = encoded.substr(i, 4);
    const nums = chunk.split('').map(c => parseInt(c, 16) / 15);
    quaternions.push(new Quaternion(...nums));
  }

  return quaternions;
}

io.on('connection', socket => {
  const url = 'https://example.com';
  const quantumData = quantumEncrypt(url);
  socket.emit('quantum-data', quantumData.map(q => q.toVector()));
});
*/

/*
const API_PORT = appCypherConfig.PORT || 8000;
app.listen(API_PORT, () => {
  console.log(`Server running on port ${API_PORT}.`);
});
*/

const { HOST, PORT, DB, AUTH_SOURCE, DB_USER, DB_PASSWORD } = dbConfig;

for (const [k, v] of Object.entries({ HOST, PORT, DB, AUTH_SOURCE, DB_USER, DB_PASSWORD })) {
  if (!v && v !== 0) {
    console.error(`❌ Missing config: ${k}`);
    process.exit(1);
  }
}

const baseUri = `mongodb://${HOST}:${PORT}/${DB}`;

console.log(`→ Mongo target: ${baseUri}?authSource=${AUTH_SOURCE}`);
console.log(`→ Mongo user:   ${DB_USER}`);

const MONGO_URI = `mongodb://${DB_USER}:${DB_PASSWORD}@${HOST}:${PORT}/${DB}?authSource=${AUTH_SOURCE}`;

(async () => {

  try {
    const db = require('./models');

    await db.mongoose.connect(baseUri, {
      user: DB_USER,
      pass: DB_PASSWORD,
      authSource: AUTH_SOURCE,
      dbName: DB,                     // extra explicit
      // autoIndex: true,                // dev; can disable in prod
      serverSelectionTimeoutMS: 5000,
      authMechanism: 'SCRAM-SHA-256', // matches Mongo 7 defaults
      useUnifiedTopology: true, // removes a deprecation warning
      useNewUrlParser: true,
      useCreateIndex: true,
      // useUnifiedTopology: true,
      // useFindAndModify: false
    });

    await db.mongoose.connection.db.command({ ping: 1 });
    console.log('✅ Mongo connected & authenticated');

    const API_PORT = appCypherConfig.PORT || 8000;
    app.listen(API_PORT, () => {
      console.log(`Server running on port ${API_PORT}.`);
    });


  


    initial(db);

    // Start connection monitor (storage/frontend handshake)
    try {
      const monitor = new ConnectionMonitor({ intervalMs: 30000 });
      monitor.start();
      console.log('→ Connection monitor started');
    } catch (e) {
      console.warn('Connection monitor failed to start:', e?.message || e);
    }
  } catch (err) {
    console.error('❌ Mongo connection error:', err);
    process.exit(1);
  }
})();

/*
function initial(db) {
  const Role = db.role;

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
*/
