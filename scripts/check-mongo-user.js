#!/usr/bin/env node
// Quick Mongo credential probe using backend .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const dbConfig = require('../config/db.config');

(async () => {
  const { HOST, PORT, DB, AUTH_SOURCE, DB_USER, DB_PASSWORD } = dbConfig;
  const baseUri = `mongodb://${HOST}:${PORT}/${DB}`;
  const uri = (DB_USER && DB_PASSWORD)
    ? `mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${HOST}:${PORT}/${DB}?authSource=${AUTH_SOURCE}`
    : baseUri;

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('→ Trying URI:', uri.replace(/:(?:[^@/]+)@/, ':***@'));

  try {
    await client.connect();
    // Ping
    await client.db(DB).command({ ping: 1 });
    console.log('✅ Connected and ping succeeded.');

    // Report connection auth info if permitted
    try {
      const adminDb = client.db(AUTH_SOURCE).admin();
      const status = await adminDb.command({ connectionStatus: 1, showPrivileges: true });
      console.log('→ Authenticated users/roles (if any):');
      console.log(JSON.stringify(status?.authInfo || {}, null, 2));
    } catch (e) {
      console.log('⚠ connectionStatus not permitted:', e.message);
    }

    // Try usersInfo for the configured user (may require admin)
    try {
      const info = await client.db(AUTH_SOURCE).command({ usersInfo: DB_USER });
      console.log('→ usersInfo result for', DB_USER, ':');
      console.log(JSON.stringify(info?.users || [], null, 2));
    } catch (e) {
      console.log('⚠ usersInfo not permitted:', e.message);
    }
  } catch (err) {
    console.error('❌ Connection/auth failed:', err.message);
    process.exitCode = 2;
  } finally {
    try { await client.close(); } catch (_) {}
  }
})();

