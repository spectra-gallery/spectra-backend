const mongoose = require('mongoose');

isValidObjectId = (req, res, next) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send({
      message: 'Invalid Id',
    });
  }
  next();
};

const objectId = {
  isValidObjectId,
};

module.exports = objectId;
