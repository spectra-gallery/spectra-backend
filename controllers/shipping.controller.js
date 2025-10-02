const axios = require('axios');
const asyncWrap = require('../middlewares/asyncWrap');
const logger = require('../utils/logger');

require('dotenv').config();

const OAUTH_TOKEN_URL = process.env.SWISSPOST_OAUTH_TOKEN_URL || '';
const OAUTH_CLIENT_ID = process.env.SWISSPOST_OAUTH_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.SWISSPOST_OAUTH_CLIENT_SECRET || '';
const OAUTH_SCOPES = process.env.SWISSPOST_OAUTH_SCOPES || '';

async function getAccessToken() {
  if (!OAUTH_TOKEN_URL || !OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    throw new Error('oauth_unconfigured');
  }
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  if (OAUTH_SCOPES) form.set('scope', OAUTH_SCOPES);
  const { data } = await axios.post(OAUTH_TOKEN_URL, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    auth: { username: OAUTH_CLIENT_ID, password: OAUTH_CLIENT_SECRET },
  });
  if (!data || !data.access_token) throw new Error('oauth_token_missing');
  return data.access_token;
}

exports.createOrder = async (req, res) => {
  try {
    const token = await getAccessToken();
    // TODO: set Swiss Post Digital Commerce order endpoint
    const ORDERS_URL = process.env.SWISSPOST_ORDERS_URL;
    if (!ORDERS_URL) return res.status(503).json({ ok: false, error: 'orders_endpoint_unconfigured' });
    const { data } = await axios.post(ORDERS_URL, req.body, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ ok: true, data });
  } catch (e) {
    const status = e?.response?.status || 500;
    logger.error('shipping_create_order_error', { err: String(e) });
    res.status(status === 401 ? 502 : status).json({ ok: false, error: 'create_order_failed', details: e?.response?.data || null });
  }
};

exports.approveOrder = async (req, res) => {
  try {
    const token = await getAccessToken();
    const { orderKey } = req.params;
    const APPROVE_URL = process.env.SWISSPOST_ORDER_APPROVAL_URL; // e.g., https://.../orders/{orderKey}/approval
    if (!APPROVE_URL) return res.status(503).json({ ok: false, error: 'orders_approval_unconfigured' });
    const url = APPROVE_URL.replace('{orderKey}', encodeURIComponent(orderKey));
    const { data } = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ ok: true, data });
  } catch (e) {
    const status = e?.response?.status || 500;
    logger.error('shipping_approve_order_error', { err: String(e) });
    res.status(status === 401 ? 502 : status).json({ ok: false, error: 'approve_order_failed', details: e?.response?.data || null });
  }
};

exports.createLabel = async (req, res) => {
  try {
    const token = await getAccessToken();
    const LABELS_URL = process.env.SWISSPOST_LABELS_URL; // e.g., create label endpoint
    if (!LABELS_URL) return res.status(503).json({ ok: false, error: 'labels_endpoint_unconfigured' });
    const { data } = await axios.post(LABELS_URL, req.body, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ ok: true, data });
  } catch (e) {
    const status = e?.response?.status || 500;
    logger.error('shipping_create_label_error', { err: String(e) });
    res.status(status === 401 ? 502 : status).json({ ok: false, error: 'create_label_failed', details: e?.response?.data || null });
  }
};

exports.trackShipment = async (req, res) => {
  try {
    const token = await getAccessToken();
    const TRACK_URL = process.env.SWISSPOST_TRACK_URL; // e.g., track endpoint with {id}
    if (!TRACK_URL) return res.status(503).json({ ok: false, error: 'track_endpoint_unconfigured' });
    const url = TRACK_URL.replace('{id}', encodeURIComponent(req.params.id));
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ ok: true, data });
  } catch (e) {
    const status = e?.response?.status || 500;
    logger.error('shipping_track_error', { err: String(e) });
    res.status(status === 401 ? 502 : status).json({ ok: false, error: 'track_failed', details: e?.response?.data || null });
  }
};

