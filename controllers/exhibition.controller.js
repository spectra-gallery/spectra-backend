const path = require('path');
const db = require('../models');
const mongoose = require('mongoose');
require('dotenv').config();
const Exhibition = db.exhibition;
const Palette = db.palette;
const Serie = db.serie;
const Media = db.media;
const User = db.user;

// slug to exhibition id
exports.slugToId = async (req, res) => {
  const slug = req.params.slug;

  const exhibition = await Exhibition.findOne({ slug: slug });

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  res.send({
    id: exhibition._id,
  });
};

exports.createExhibition = async (req, res) => {
  if (!req.body.name || !req.body.description) {
    return res.status(400).send({
      message: 'Fields cannot be empty',
    });
  }

  const userId = req.userId;

  const user = await User.findById(userId);

  const media = new Media({
    url: req.body.media.url,
    width: req.body.media.width,
    height: req.body.media.height,
    ratio: req.body.media.ratio,
    type: req.body.media.type,
  });

  await media.save();

  const slug = req.body.name.toLowerCase().replace(/ /g, '-');

  const exhibition = new Exhibition({
    name: req.body.name,
    slug: slug,
    headline: req.body.headline,
    description: req.body.description,
    media: media._id,
    opening: req.body.opening,
    closing: req.body.closing,
    display: req.body.display,
    series: req.body.series,
    curators: [userId, ...req.body.curators],
    volume: req.body.volume,
  });

  await exhibition.save();

  const paletteArray = req.body.palette;

  const palettePromises = paletteArray.map(async (pal) => {
    const element = await Palette.findOne({
      hex: pal,
    });

    if (!element) {
      const palette = new Palette({
        hex: pal,
      });

      await palette.save()
        .then((data) => {
          exhibition.palette.push(data._id);
        }).catch((err) => {
          console.log(err);
        });
    }
    if (element) {
      exhibition.palette.push(element._id);
    }
  }
  );

  await Promise.all(palettePromises);
  await exhibition.save();

  res.send({
    id: exhibition._id,
    slug: exhibition.slug,
  });




};

// get exhibition by id
exports.getExhibitionById = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findOne({
    _id: id,
  })
    .populate({
      path: 'series',
      populate: [
        {
          path: 'media',
          select: '_id url width height ratio type',
        },
        {
          path: 'artists',
          select: '_id slug username imageUrl',
        },
        {
          path: 'sketch',
          select: '_id url hash',
        }
      ],
      select: '_id slug name image type media sketch subtitle',
    })
    .populate('media', '_id url width height ratio type')
    .populate('curators', '_id slug username imageUrl')
    .populate('palette', '_id hex')
    .populate('like', '_id slug username imageUrl')
    .populate('reviewedBy', '_id slug username imageUrl')
    .exec();

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const exhibitionObject = {
    id: exhibition._id,
    slug: exhibition.slug,
    name: exhibition.name,
    headline: exhibition.headline,
    description: exhibition.description,
    media: exhibition.media,
    opening: exhibition.opening,
    closing: exhibition.closing,
    display: exhibition.display,
    reviewed: exhibition.reviewed,
    reviewedBy: exhibition.reviewedBy,
    series: exhibition.series,
    palette: exhibition.palette,
    curators: exhibition.curators,
    like: exhibition.like,
    likes: exhibition.likes,
    date: exhibition.date,
    modified: exhibition.modified,
    volume: exhibition.volume,
  };

  res.status(200).send(exhibitionObject);
};

exports.getDisplayExhibition = async (req, res) => {
  const number = parseInt(req.params.number);

  const sort = parseInt(req.query.sort);

  let sorting = { date: -1 };
  if (sort === 0) {
    sorting = { date: -1 };
  } else if (sort === 1) {
    sorting = { date: 1 };
  }

  const exhibitions = await Exhibition.find({ display: true })
    .sort(sorting)
    .limit(number)
    .populate({
      path: 'series',
      populate: [
        {
          path: 'media',
          select: '_id url width height ratio type',
        },
        {
          path: 'artists',
          select: '_id slug username imageUrl',
        },
      ],
      select: '_id slug name image type media sketch subtitle',
    })
    .populate('media', '_id url width height ratio type')
    .populate('curators', '_id slug username imageUrl')
    .populate('palette', '_id hex')
    .populate('like', '_id slug username imageUrl')
    .exec();

  if (!exhibitions) {
    return res.status(404).send({
      message: 'Exhibitions not found',
    });
  }

  const exhibitionsArray = [];

  exhibitions.forEach((exhibition) => {
    exhibitionsArray.push({
      id: exhibition._id,
      slug: exhibition.slug,
      name: exhibition.name,
      headline: exhibition.headline,
      description: exhibition.description,
      media: exhibition.media,
      opening: exhibition.opening,
      closing: exhibition.closing,
      curators: exhibition.curators,
      display: exhibition.display,
      reviewed: exhibition.reviewed,
      reviewedBy: exhibition.reviewedBy,
      palette: exhibition.palette,
      series: exhibition.series,
      like: exhibition.like,
      likes: exhibition.likes,
    });
  });
 
  res.status(200).send(exhibitionsArray);
};

// getExhibitionByArtist
// get exhibitions with serie.artists in series array containing artist id, populate serie, media, curators, palette
exports.getExhibitionByArtist = async (req, res) => {
  const id = req.params.id;
  const number = req.query.number;

  const promise = new Promise((resolve, reject) => {

    Exhibition.aggregate([
      {
        $lookup: {
          from: 'series',
          localField: 'series',
          foreignField: '_id',
          as: 'series',
        },
      },
      {
        $unwind: '$series',
      },
      // if series.artists mongo object array contains artist id
      {
        $match: {
          'series.artists': mongoose.Types.ObjectId(id),
       
        },
      },
      
      {
        $lookup: {
          from: 'media',
          localField: 'media',
          foreignField: '_id',
          as: 'media',
        },
      },
      {
        $unwind: '$media',
      },
      // populate curators array with user object matching ids
      {
        $lookup: {
          from: 'users',
          localField: 'curators',
          foreignField: '_id',
          as: 'curators',
        },
      },
      // populate palette array wuth palette object matching ids
      {
        $lookup: {
          from: 'palettes',
          localField: 'palette',
          foreignField: '_id',
          as: 'palette',
        },
      },

      // populate like array with user object matching ids
      {
        $lookup: {
          from: 'users',
          localField: 'like',
          foreignField: '_id',
          as: 'like',
        },
      },
    
      {
        $group: {
          _id: '$_id',
          exhibition: { $first: '$$ROOT' },
          series: { $push: '$series' },
        }
      },
      {
        $addFields: {
          'exhibition.series': '$series',
        },
      },
      // Replace root with exhibition document
      {
        $replaceRoot: { newRoot: '$exhibition' }
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $limit: parseInt(number),
      },
    ]).exec((err, result) => {
      if (err) {
        reject(err);
      }

      resolve(result);
    });
  
  });

  return promise;
};

exports.editExhibitionName = async (req, res) => {
  const id = req.params.id;

  const name = req.body.name;
  const slug = name.toLowerCase().replace(/ /g, '-');

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  exhibition.name = req.body.name;
  exhibition.slug = slug;

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    name: exhibition.name,
    slug: exhibition.slug,
  });
}

exports.editExhibitionHeadline = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  exhibition.headline = req.body.headline;

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    headline: exhibition.headline,
  });
}

exports.editExhibitionDescription = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  exhibition.description = req.body.description;

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    description: exhibition.description,
  });

}

// editExhibitionOpening
exports.editExhibitionOpening = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  exhibition.opening = req.body.opening;

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    opening: exhibition.opening,
  });
}

// editExhibitionClosing
exports.editExhibitionClosing = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  exhibition.closing = req.body.closing;

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    closing: exhibition.closing,
  });
}

exports.setExhibitionDisplay = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  exhibition.display = req.body.display;

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    display: exhibition.display,
  });
}

exports.reviewExhibition = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  exhibition.reviewed = req.body.reviewed;
  exhibition.reviewedBy.push(userId);
  exhibition.reviewedDate = new Date().toISOString();

  await exhibition.save();

  const reviewedBy = {
    id: user._id,
    slug: user.slug,
    username: user.username,
    imageUrl: user.imageUrl,
  }

  const review = {
    reviewed: exhibition.reviewed,
    reviewedBy: reviewedBy,
    reviewedDate: exhibition.reviewedDate,
  };
  

  res.status(200).send({
    id: exhibition._id,
    review: review,
  });
}

exports.updatePalette = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const color = req.body.color;

  let palette;

  const element = await Palette.findOne({
    hex: color,
  });

  if (!element) {
    palette = new Palette({
      hex: color,
    });

    await palette.save()
      .then((data) => {
        exhibition.palette.push(data._id);
      }).catch((err) => {
        console.log(err);
      });
  }
  if (element) {
    exhibition.palette.push(element._id);
  }

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    palette: palette,
  });
}

exports.addSerie = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const serieId = req.body.serieId;

  if (exhibition.series.includes(serieId)) {
    return res.status(400).send({
      message: 'Serie already added',
    });
  }

  exhibition.series.push(serieId);

  await exhibition.save();

  /*

  const serie = await Serie.findById(serieId);

  if (!serie) {
    return res.status(404).send({
      message: 'Serie not found',
    });
  }

  */

  res.status(200).send({
    id: exhibition._id,
    serieId: serieId,
  });

}

exports.removeSerie = async (req, res) => {
  const id = req.params.id;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const serieId = req.query.serieId;

  const index = exhibition.series.indexOf(serieId);

  if (index > -1) {
    exhibition.series.splice(index, 1);
  } else {
    return res.status(404).send({
      message: 'Serie not found',
    });
  }

  await exhibition.save();


  res.status(200).send({
    id: exhibition._id,
    serieId: serieId,
  });

}

exports.removeColor = async (req, res) => {
  const id = req.params.id;

  const colorId = req.query.colorId;

  const exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const index = exhibition.palette.indexOf(colorId);

  if (index > -1) {
    exhibition.palette.splice(index, 1);
  }

  await exhibition.save();

  res.status(200).send({
    id: exhibition._id,
    colorId: colorId,
  });

}

// likeExhibition
exports.likeExhibition = async (req, res) => {
  const id = req.params.id;

  const userId = req.userId;
  let exhibition;

  exhibition = await Exhibition.findById(id);

  if (!exhibition) {
    return res.status(404).send({
      message: 'Exhibition not found',
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send({
      message: 'User not found',
    });
  }

  if (exhibition.like.includes(userId)) {
    // remove like
    const index = exhibition.like.indexOf(userId);
    if (index > -1) {
      exhibition.like.splice(index, 1);
    }

    exhibition.likes = exhibition.likes - 1;
  } else {
    // add like
    exhibition.like.push(userId);
    exhibition.likes = exhibition.likes + 1;
  }
  
  await exhibition.save();

  exhibition = await Exhibition.findById(id)
    .populate('like', '_id slug username imageUrl')
    .exec();

  res.status(200).send({
    id: exhibition._id,
    like: exhibition.like,
    likes: exhibition.likes,
  });

}

exports.fetchPalette = () => {
  const promise = new Promise((resolve, reject) => {
    Palette.find({}).exec((err, colors) => {
      resolve(colors);
      if (err) reject(err);
    });
  });
  return promise;
};