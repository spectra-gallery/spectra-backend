const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose  = require('mongoose');
const http = require('http');

const app = express();

const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('./utils/socketAuth');

const ServerInit = require('./utils/ServerInit');
const initial = ServerInit;

const appCypherConfig = require('./config/app.cypher.config');
const dbConfig  = require('./config/db.config');
const requestContext = require('./middlewares/requestContext');
const errorHandler = require('./middlewares/errorHandler');
// defer ConnectionMonitor require until DB is connected to avoid loading mail/models in SKIP_DB mode

// Load environment based on APP_ENV/NODE_ENV to pick the right .env file
(() => {
  const path = require('path');
  const dotenv = require('dotenv');
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const map = { development: '.env.dev', dev: '.env.dev', staging: '.env.staging', production: '.env', prod: '.env' };
  const filename = map[env] || (env ? `.env.${env}` : '.env');
  const envPath = path.join(__dirname, filename);
  // Load specific file first (if exists), then fallback to base .env
  dotenv.config({ path: envPath });
  dotenv.config();
})();

const CLIENT_URL = process.env.CLIENT_URL || appCypherConfig.CLIENT_URL;
const STORAGE_API_URL = process.env.STORAGE_API_URL || appCypherConfig.STORAGE_API_URL;

global.__basedir = __dirname;


const corsOrigins = [CLIENT_URL, STORAGE_API_URL, 'http://localhost', 'https://dev.spectra.gallery']
  .filter(Boolean)
  .map(u => (typeof u === 'string' ? u.replace(/\/+$/, '') : u));
const corsOptions = { origin: corsOrigins.length ? corsOrigins : [/^http:\/\/localhost:\d+$/] };

app.use(cors(corsOptions));

// request tracing
app.use(requestContext);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

// Create HTTP server and Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigins.length ? corsOrigins : [/^http:\/\/localhost:\d+$/],
    credentials: true
  },
  path: '/socket.io'
});

// Namespaced realtime with signed auth
const nsp = io.of('/realtime');
nsp.use(socketAuthMiddleware);
nsp.on('connection', (socket) => {
  // Attach default user room if authenticated
  if (socket.user?.id) socket.join(`user:${socket.user.id}`);
  socket.emit('welcome', { ts: Date.now(), id: socket.id, user: socket.user || null });

  // Client can subscribe to limited, prefixed rooms
  socket.on('subscribe', ({ room }) => {
    if (typeof room !== 'string') return;
    if (/^(serie:|gallery:|post:)/.test(room)) socket.join(room);
  });
  socket.on('unsubscribe', ({ room }) => {
    if (typeof room !== 'string') return;
    if (/^(serie:|gallery:|post:)/.test(room)) socket.leave(room);
  });
  socket.on('ping', (payload) => socket.emit('pong', { ts: Date.now(), payload }));
});

// Make io accessible to routes/controllers if needed
app.set('io', io);

app.use(express.static(path.join(__dirname, 'ressources'),
    {xframe: 'ALLOW-FROM *'}));

// Optional admin dashboard static mount (utils/admin or ADMIN_DASH_DIR)
try {
  const fs = require('fs');
  const adminDir = process.env.ADMIN_DASH_DIR || path.join(__dirname, '..', 'utils', 'admin');
  if (fs.existsSync(adminDir)) {
    app.use('/admin', express.static(adminDir));
    console.log('→ Admin dashboard mounted at /admin from', adminDir);
  } else {
    console.log('→ Admin dashboard not found (set ADMIN_DASH_DIR to enable)');
  }
} catch (_e) {
  console.warn('Admin dashboard mount skipped:', _e && _e.message);
}


app.get('/', (req, res) => {
  res.json({message: 'Spectra API'});
});

const SKIP_DB_ROUTES = process.env.SKIP_DB === '1';
if (!SKIP_DB_ROUTES) {
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
  require('./routes/analytics.routes')(app);
} else {
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'backend', port: appCypherConfig.PORT || 8000, db: { state: 'skipped' } });
  });
  app.get('/api/monitor', (req, res) => {
    res.json({ ok: true, backend: { ok: true }, storage_health: { ok: true, data: {} }, frontend: { ok: true } });
  });
}

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

/* replaced by server.listen after DB connect */

const SKIP_DB = process.env.SKIP_DB === '1';

if (!SKIP_DB) {
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
        dbName: DB,
        serverSelectionTimeoutMS: 5000,
        authMechanism: 'SCRAM-SHA-256',
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true,
      });

      await db.mongoose.connection.db.command({ ping: 1 });
      console.log('✅ Mongo connected & authenticated');

      const API_PORT = appCypherConfig.PORT || 8000;
      server.listen(API_PORT, () => {
        console.log(`Server running on port ${API_PORT}. (HTTP + Socket.IO)`);
      });

      initial(db);

      try {
        const { ConnectionMonitor } = require('./services/connectionMonitor');
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
} else {
  console.warn('⚠ Running without MongoDB (SKIP_DB=1). Some features are disabled.');
  const API_PORT = appCypherConfig.PORT || 8000;
  server.listen(API_PORT, () => {
    console.log(`Server running on port ${API_PORT}. (HTTP + Socket.IO, no DB)`);
  });
}

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
// behind reverse proxy (nginx), trust proxy for secure cookies/rate limits
app.set('trust proxy', 1);

// Security middleware (optional if modules available)
try {
  const helmet = require('helmet');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
} catch (_) {
  /* helmet not installed; skipping */
}
try {
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
  app.use(limiter);
} catch (_) {
  /* limiter not installed; skipping */
}
