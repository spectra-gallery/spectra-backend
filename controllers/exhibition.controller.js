const db = require('../models');
require('dotenv').config();
const Exhibition = db.exhibition;

exports.createExhibition = async (req, res) => {
  const collectionId = req.params.id;
  const name = req.body.name;
  const headline = req.body.headline;
  const opening = req.body.opening;
  const display = req.body.display;

  const exhibition = new Exhibition({
    name: name,
    headline: headline,
    opening: opening,
    display: display,
    collectionId: collectionId,
  });

  exhibition.save((err, exhibition) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }
    res.status(200).send({
      id: exhibition._id,
    });
  });
};

exports.getAllExhibitions = async (req, res) => {
  const exhibitions = await Exhibition.find({})
      .populate({
        path: 'collectionId',
        populate: [
          {
            path: 'sketch',
            select: 'hash url sizeBytes',
          },
          {
            path: 'artists',
            select: '_id slug username',
          },
        ],
        select: '_id name slug image subtitle supply totalSupply price',
      })
      .exec();

  const exhibitionsArray = [];

  exhibitions.forEach((exhibition) => {
    exhibitionsArray.push({
      id: exhibition._id,
      name: exhibition.name,
      headline: exhibition.headline,
      opening: exhibition.opening,
      display: exhibition.display,
      collectionId: exhibition.collectionId,
    });
  });

  res.status(200).send(exhibitionsArray);
};

exports.getDisplayExhibition = async (req, res) => {
  const exhibitions = await Exhibition.find({display: true})
      .populate({
        path: 'collectionId',
        populate: [
          {
            path: 'sketch',
            select: 'hash url sizeBytes',
          },
          {
            path: 'artists',
            select: '_id slug username',
          },
        ],
        select: '_id slug name image subtitle supply totalSupply price',
      })
      .exec();

  const exhibitionsArray = [];

  exhibitions.forEach((exhibition) => {
    exhibitionsArray.push({
      id: exhibition._id,
      name: exhibition.name,
      headline: exhibition.headline,
      opening: exhibition.opening,
      display: exhibition.display,
      collectionId: exhibition.collectionId,
    });
  });
  res.status(200).send(exhibitionsArray);
};

exports.getDisplayExhibitionById = async (req, res) => {
  const exhibitionId = req.params.id;
  const exhibition = await Exhibition.findById(exhibitionId)
      .populate({
        path: 'collectionId',
        populate: [
          {
            path: 'sketch',
            select: 'hash url sizeBytes',
          },
          {
            path: 'artists',
            select: '_id slug username',
          },
        ],
        select: '_id slug name image subtitle supply totalSupply price',
      })
      .exec();

  res.status(200).send({
    id: exhibition._id,
    name: exhibition.name,
    headline: exhibition.headline,
    opening: exhibition.opening,
    display: exhibition.display,
    collectionId: exhibition.collectionId,
  });
};

exports.setExhibitionDisplay = async (req, res) => {
  const exhibitionId = req.params.id;

  const exhibition = await Exhibition.findById(exhibitionId);
  exhibition.display = !exhibition.display;
  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    display: exhibition.display,
  });
};

exports.deleteExhibition = async (req, res) => {
  const exhibitionId = req.body.id;

  await Exhibition.findByIdAndRemove(exhibitionId);

  res.status(200).send({
    id: exhibitionId,
  });
};
