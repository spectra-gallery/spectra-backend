const mongoose = require('mongoose')

const Recursion = mongoose.model(
  'Recursion',
  new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    config: { type: Object },
    payload: { type: Object },
    createdAt: { type: Date, default: Date.now }
  })
)

module.exports = Recursion

