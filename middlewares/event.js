const mongoose = require("mongoose");
const db = require("../models");

require("dotenv").config();

const VIEW_TIMEOUT = process.env.VIEW_TIMEOUT;

const View = db.view;
// const Session = db.session;

debounceView = async (req, res, next) => {
  const id = req.params.id;

  /*
  const target = req.target;
  const model = db[target];
  */

  const session = req.sessionId;

  const view = await View.findOne({
    session: session,
    target: id,
  });

  if (view) {
    // check if the view is older than 1 month
    const now = new Date();
    const viewDate = new Date(view.date);
    const diff = now - viewDate;

    if (diff < VIEW_TIMEOUT) {
      // interrupt the request wit
      res.status(204).send({ message: "Already viewed" });
      return;
    }

    await view.remove();
    next();
  } else {
    const view = new View({
      target: id,
      session: session,
    });

    await view.save();
    next();
  }

  /*
  Session.findOne({ sessionId: session })
    .populate("views", "-__v")
    .exec((err, session) => {
      if (err) {
        return res.status(500).send({ message: err });
      }
      if (!session) {
        return res.status(403).send({ message: "Require Session!" });
      }

      // check if there is a view in session.views array that matches the target
      const view = session.views.find((view) => view.target === id);

      if (view) {
        // check if the view is older than 1 month
        const now = new Date();
        const viewDate = new Date(view.date);
        const diff = now - viewDate;

        if (diff < VIEW_TIMEOUT) {
          // dont propagate the request
          return;
        }

        view.remove().then(() => {
          next();
        });
      } else {
        const view = new View({
          target: id,
        });

        return view.save();
      }
    })
    .then((view) => {
      session.views.push(view._id);
      session.save().then(() => {
        next();
      });
    })
    .catch((err) => {
      // dont propagate the request
      return;
    });
    */
};

const event = {
  debounceView,
};

module.exports = event;
