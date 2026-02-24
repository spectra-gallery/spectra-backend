const mongoose = require("mongoose");

const Hash = mongoose.model(
  "Hash",
  new mongoose.Schema({
    hash: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
    chain: { type: String, default: "ethereum" },
  }).pre("save", function (next) {
    if (!this.hash) {
      this.hash = generate(this.chain);
    }
    next();
  })
);


const generate = (chain) => {
  const hash = generateHash();
  if (chain === "bitcoin") {
    return hash + "i0";
  } else if (chain === "ethereum") {
    return "0x" + hash;
  } else {
    return hash;
  }
};
const generateHash = () => {
  const tokenIdRand =
    (Math.floor(Math.random() * 1000000) + 1) * 1000000 +
    (Math.floor(Math.random() * 100) + 1);
  const hash = keccak256(tokenIdRand.toString()).toString("hex");
  return hash;
};

module.exports = Hash;
