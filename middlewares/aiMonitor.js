require("@tensorflow/tfjs");
const toxicity = require("@tensorflow-models/toxicity");

const db = require("../models");

const threshold = 0.9;

const checkVariable = (variable) => {
  return variable ? variable : "";
};

intercept = async (req, res, next) => {
  const aiReview = req.body.aiReview;

  if (!aiReview) {
    next();
    return;
  }

  const [title, content, name, subtitle, description] = req.body;

  // check one by one if variables are defined

  // make a new array with all the variables that are defined keeping track of the label
  const textAnalyse = [
    { text: checkVariable(title), label: "title" },
    { text: checkVariable(content), label: "content" },
    { text: checkVariable(name), label: "name" },
    { text: checkVariable(subtitle), label: "subtitle" },
    { text: checkVariable(description), label: "description" },
  ];

  if (textAnalyse.length === 0) {
    next();
    return;
  }

  toxicity.load(threshold).then((model) => {
    const trigger = [];

    for (const text of textAnalyse) {
      model
        .classify(text.text)
        .then((predictions) => {
          for (const prediction of predictions) {
            if (prediction.results[0].match) {
              trigger.push({
                origin: text.label,
                text: text.text,
                label: prediction.label,
              });
            }

            if (contentTriggered.length > 0) {
              return res.status(400).send({
                sensible: trigger.length > 0,
                message: "Sensible Content Detected",
                content: trigger,
              });
            }
          }

          req.legit = trigger.length === 0;

          next();

          return;
        })
        .catch((error) => {
          return res.status(500).send({ message: error });
        });
    }
  });

  next();
};

module.exports = {
  intercept,
};
