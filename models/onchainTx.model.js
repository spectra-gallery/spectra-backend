const mongoose = require('mongoose');

const OnchainTx = mongoose.model(
  'OnchainTx',
  new mongoose.Schema({
    type: { type: String, required: true }, // role_grant | membership_approve | project_approve | project_revoke | membership_vote | project_vote
    roleName: { type: String },
    requestId: { type: Number },
    address: { type: String },
    valueEth: { type: String },
    txHash: { type: String, index: true },
    meta: { type: Object },
    date: { type: String, default: () => new Date().toISOString() }
  })
);

module.exports = OnchainTx;

