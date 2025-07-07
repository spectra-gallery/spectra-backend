const mongoose = require("mongoose");

const crypto = require("crypto");
const { encodeString, encryptString } = require("../helpers/cypher.helpers");

const Cypher = mongoose.model(
  "Cypher",
  new mongoose.Schema({
    route_id: {
      type: String,
      unique: true,
      required: true,
      select: false,
    },
    secret: {
      type: String,
      unique: true,
      required: true,
      select: false,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    }
  }).pre("save", function (next) {
    this.secret = encodeString(this.secret);

    this.route_id = encryptString(this.route_id, this.secret);

    next();
  })
);

module.exports = Cypher;
