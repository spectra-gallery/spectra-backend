// Load base .env as a fallback; app.cypher.config.js handles APP_ENV-specific files.
require('dotenv').config();

// Normalize env var names across dev/prod examples:
// - DB vs DB_NAME
// - AUTH_SOURCE vs DB_AUTH_SOURCE
// Also accept common Mongo-style MONGO_DB, MONGO_HOST, MONGO_PORT if provided.

const HOST = process.env.DB_HOST || process.env.MONGO_HOST || '127.0.0.1';
const PORT = Number(process.env.DB_PORT || process.env.MONGO_PORT || 27017);
const DB = process.env.DB_NAME || process.env.DB || process.env.MONGO_DB || 'spectra';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const AUTH_SOURCE =
  process.env.DB_AUTH_SOURCE ||
  process.env.AUTH_SOURCE ||
  process.env.MONGO_AUTH_SOURCE ||
  process.env.DB_NAME ||
  DB ||
  'admin';

module.exports = { HOST, PORT, DB, DB_USER, DB_PASSWORD, AUTH_SOURCE };
