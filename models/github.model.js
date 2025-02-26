const mongoose = require("mongoose");

const Github = mongoose.model(
  "Github",
  new mongoose.Schema({
    id: String,
    username: String,
    displayName: String,
    token: String,
})
);

module.exports = Github;
