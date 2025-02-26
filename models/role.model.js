const mongoose = require("mongoose");
const crypto = require("crypto");
const Role = mongoose.model(
  "Role",
  new mongoose.Schema({
    name: {
      type: String,
      enum: ['user', 'admin', 'creator', 'thinker', 'reviewer', 'e-libre', 'myself'],
      required: true,
    },
    hash: {
      type: String,
      required: async () => {
        return this.name === "admin";
      },
      select: false
    },
    _2FA: {
      type: Boolean,
      default: false
    },
  }).pre('save', function (next) {
    if (this.name === "admin") {
      this.hash = crypto.randomBytes(20).toString("hex");
    }

    const require2FA = ['creator', 'thinker', 'reviewer', 'e-libre', 'myself'];
    if (require2FA.includes(this.name)) {
      this._2FA = true;
    } 

    next();
  })
);



module.exports = Role;
