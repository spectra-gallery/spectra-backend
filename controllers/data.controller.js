const db = require("../models");
const mail = require("../middlewares/mail");
require("dotenv").config();

const dataViz = require("../config/dataviz.config");

// const Dataviz = db.dataviz;

// get the word cloud configuration
exports.getWordCloud = async (req, res) => {
  try {
    // const wordCloud = await Dataviz.findOne();
    return res.status(200).send(dataViz.wordCloud);
  } catch (err) {
    return res.status(500).send({ message: err });
  }
};
