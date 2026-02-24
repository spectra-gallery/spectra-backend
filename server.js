const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose  = require('mongoose');
const http = require('http');
const https = (() => { try { return require('https'); } catch (_) { return null; } })();
const fs = require('fs');

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

// Env is loaded in config/app.cypher.config.js (sets __ENV_FILE)

const CLIENT_URL = process.env.CLIENT_URL || appCypherConfig.CLIENT_URL;
const STORAGE_API_URL = process.env.STORAGE_PUBLIC_URL || appCypherConfig.STORAGE_PUBLIC_URL;

global.__basedir = __dirname;


// CORS: allow local loopback and spectra domains, plus env list
const extraCors = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const rootDomain = (process.env.ROOT_DOMAIN || 'spectra.gallery').replace(/\.+$/, '');
const apiDomain = process.env.API_DOMAIN || `api.${rootDomain}`;
const storageDomain = process.env.STORAGE_DOMAIN || `storage.${rootDomain}`;
const defaultOrigins = [
  CLIENT_URL,
  STORAGE_API_URL,
  'http://localhost',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:6601',
  `https://${rootDomain}`,
  `https://${apiDomain}`,
  `https://${storageDomain}`,
  `https://dev.${rootDomain}`
].filter(Boolean).map(u => (typeof u === 'string' ? u.replace(/\/+$/, '') : u));
const corsOrigins = Array.from(new Set([...defaultOrigins, ...extraCors]));
const corsRegex = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  new RegExp('^https://(.*\\.)?' + rootDomain.replace(/\./g, '\\.') + '$')
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    if (corsRegex.some(rx => rx.test(origin))) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

// request tracing
app.use(requestContext);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

// Create HTTP/HTTPS server and Socket.IO
let server;
const ENABLE_HTTPS = String(process.env.ENABLE_HTTPS || '').toLowerCase() === '1';
if (ENABLE_HTTPS && https) {
  try {
    const key = fs.readFileSync(process.env.TLS_KEY_PATH || './keys/server.key');
    const cert = fs.readFileSync(process.env.TLS_CERT_PATH || './keys/server.crt');
    const ca = process.env.TLS_CA_PATH && fs.existsSync(process.env.TLS_CA_PATH) ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined;
    const opts = ca ? { key, cert, ca } : { key, cert };
    server = https.createServer(opts, app);
    console.log('HTTPS enabled for backend');
  } catch (e) {
    console.warn('Failed to enable HTTPS (falling back to HTTP):', e?.message || e);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

console.log(`[backend] env=${process.env.APP_ENV || process.env.NODE_ENV} file=${process.env.__ENV_FILE} port=${appCypherConfig.PORT} internal_storage=${process.env.STORAGE_INTERNAL_URL || appCypherConfig.STORAGE_INTERNAL_URL}`);

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
  require('./routes/generativeSerie.routes')(app);
  require('./routes/lab.routes')(app);
  require('./routes/print.routes')(app);
  require('./routes/health.routes')(app);
  require('./routes/ordinal.routes')(app);
  require('./routes/monitor.routes')(app);
  require('./routes/timeline.routes')(app);
  require('./routes/telemetry.routes')(app);
  require('./routes/draft.routes')(app);
  require('./routes/analytics.routes')(app);
  require('./routes/apply.routes')(app);
  require('./routes/admin.apply.routes')(app);
  require('./routes/admin.whitelist.routes')(app);
  require('./routes/dao.tx.routes')(app);
  require('./routes/dao.admin.routes')(app);
  require('./routes/chain.routes')(app);
  require('./routes/admin.onchain.routes')(app);
  require('./routes/agent.chat.routes')(app);
  require('./routes/onchain.tx.routes')(app);
  require('./routes/chain.reconcile.routes')(app);
  require('./routes/admin.provenance.routes')(app);
  require('./routes/ops.routes')(app);
} else {
  // Minimal routes for handshake and health even without DB
  require('./routes/app.auth.routes')(app);
  require('./routes/storage.auth.routes')(app);
  require('./routes/health.routes')(app);

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

// Helper to start API server without DB (fallback mode)
function startApiNoDb() {
  console.warn('⚠ Falling back to no-DB mode. Some features are disabled.');
  const API_PORT = appCypherConfig.PORT || 8000;
  const API_HOST = process.env.HOST || '0.0.0.0';
  function startApiServer(host) {
    try {
      server.listen(API_PORT, host, () => {
        console.log(`Server running on http://${host}:${API_PORT}. (HTTP + Socket.IO, no DB)`);
        try {
          const base = (process.env.WEBAUTHN_ORIGIN || process.env.BASE_URL || `http://localhost:${API_PORT}`).replace(/\/+$/,'');
          console.log(`→ YubiKey setup: ${base}/api/auth/2fa/register (requires auth token)`);
          console.log(`→ YubiKey auth:  ${base}/api/auth/2fa/login`);
        } catch (_) { /* no-op */ }
      });
    } catch (e) {
      if ((e && (e.code === 'EPERM' || e.code === 'EACCES')) && host !== '127.0.0.1') {
        console.warn(`Listen denied on ${host}:${API_PORT} (${e.code}); retrying on 127.0.0.1`);
        return startApiServer('127.0.0.1');
      }
      throw e;
    }
    server.once('error', (err) => {
      if ((err.code === 'EPERM' || err.code === 'EACCES') && host !== '127.0.0.1') {
        console.warn(`Listen denied on ${host}:${API_PORT} (${err.code}); retrying on 127.0.0.1`);
        return startApiServer('127.0.0.1');
      }
      console.error('Server listen error:', err);
      process.exitCode = 1;
    });
  }
  // Minimal routes for handshake and health
  try {
    require('./routes/app.auth.routes')(app);
    require('./routes/storage.auth.routes')(app);
  } catch (_) { /* optional */ }
  try { require('./routes/health.routes')(app); } catch (_) { /* optional */ }
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'backend', port: appCypherConfig.PORT || 8000, db: { state: 'skipped' } });
  });
  app.get('/api/monitor', (req, res) => {
    res.json({ ok: true, backend: { ok: true }, storage_health: { ok: true, data: {} }, frontend: { ok: true } });
  });
  startApiServer(API_HOST);
}

if (!SKIP_DB) {
  const { HOST, PORT, DB, AUTH_SOURCE, DB_USER, DB_PASSWORD } = dbConfig;

  let missing = [];
  for (const [k, v] of Object.entries({ HOST, PORT, DB, AUTH_SOURCE, DB_USER, DB_PASSWORD })) {
    if (!v && v !== 0) missing.push(k);
  }
  if (missing.length) {
    console.error(`❌ Missing Mongo config keys: ${missing.join(', ')}`);
    return startApiNoDb();
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
      const API_HOST = process.env.HOST || '0.0.0.0';
      function startApiServer(host) {
        try {
          server.listen(API_PORT, host, () => {
            console.log(`Server running on http://${host}:${API_PORT}. (HTTP + Socket.IO)`);
            try {
              const base = (process.env.WEBAUTHN_ORIGIN || process.env.BASE_URL || `http://localhost:${API_PORT}`).replace(/\/+$/,'');
              console.log(`→ YubiKey setup: ${base}/api/auth/2fa/register (requires auth token)`);
              console.log(`→ YubiKey auth:  ${base}/api/auth/2fa/login`);
            } catch (_) { /* no-op */ }
          });
        } catch (e) {
          if ((e && (e.code === 'EPERM' || e.code === 'EACCES')) && host !== '127.0.0.1') {
            console.warn(`Listen denied on ${host}:${API_PORT} (${e.code}); retrying on 127.0.0.1`);
            return startApiServer('127.0.0.1');
          }
          throw e;
        }
        server.once('error', (err) => {
          if ((err.code === 'EPERM' || err.code === 'EACCES') && host !== '127.0.0.1') {
            console.warn(`Listen denied on ${host}:${API_PORT} (${err.code}); retrying on 127.0.0.1`);
            return startApiServer('127.0.0.1');
          }
          console.error('Server listen error:', err);
          process.exitCode = 1;
        });
      }
      startApiServer(API_HOST);

      initial(db);

      // Development-only helper routes
      try {
        if (process.env.NODE_ENV !== 'production') {
          require('./routes/dev.routes')(app);
          console.log('→ Dev routes enabled');
        }
      } catch (_) { /* optional in prod */ }

      try {
        const { ConnectionMonitor } = require('./services/connectionMonitor');
        const monitor = new ConnectionMonitor({ intervalMs: 30000 });
        monitor.start();
        console.log('→ Connection monitor started');
      } catch (e) {
        console.warn('Connection monitor failed to start:', e?.message || e);
      }
    } catch (err) {
      console.error('❌ Mongo connection error:', err && (err.message || err));
      return startApiNoDb();
    }
  })();
} else {
  startApiNoDb();
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
