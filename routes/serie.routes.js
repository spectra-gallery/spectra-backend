/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const {verifySerie} = require('../middlewares');
const controller = require('../controllers/serie.controller');
const uploadController = require('../controllers/fileUpload.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    // x-frame-options sameorigin
    res.header('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // slugToId
  app.get('/api/serie/slug/:slug', controller.slugToId);

  // fetchSerieName
  app.get('/api/serie/name', [authJwt.verifyToken], (req, res) => {
    const elements = controller.fetchSerieName(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // create serie
  // app.post('/api/serie', [authJwt.verifyToken, authJwt.isCreator, verifySerie.checkDuplicateName], controller.createSerie);

  app.post('/api/serie', [authJwt.verifyToken, verifySerie.checkDuplicateName], controller.createSerie);

  // createUserSerie
  app.post('/api/serie/user', [authJwt.verifyToken, authJwt.isAdmin], controller.createUserSerie);

  // generateSketch
  app.post('/api/serie/sketch', [authJwt.verifyToken], controller.generateSketch);

  // parseSketch
  app.post('/api/serie/sketch/parse', [authJwt.verifySession], controller.parseSketch);

  // assignSketchUrl
  app.post('/api/serie/sketchurl', [authJwt.verifyToken], controller.assignSketchUrl);

  // upload serie sketch data
  app.post('/api/serie/data', [authJwt.verifyToken], uploadController.htmlUpload);

  // serie html to img
  app.post('/api/serie/generate', [authJwt.verifyToken], uploadController.htmlToImg);

  // get all series by page
  app.get('/api/serie/all/:page', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getAllSeries
  app.get('/api/serie/list', [authJwt.verifySession], (req, res) => {
    const elements = controller.getAllSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });
  // fetchAllSeriesByNumber
  app.get('/api/serie/allnumber/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchAllSeriesByNumber(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get serie by id
  app.get('/api/serieid/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchSerieById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get serie by artist
  app.get('/api/serie/artist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchSerieByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchOnSaleSeries
  app.get('/api/serie/onsale', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchOnSaleSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetch featured series
  app.get('/api/serie/featured', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchFeaturedSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchTrendingSeries
  app.get('/api/serie/trending', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchTrendingSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedSeries
  app.get('/api/serie/recommended', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRecommendedSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedSeriesOmitArtist
  app.get('/api/serie/recommendedomitartist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchRecommendedSeriesOmitArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedSeriesOnSale
  app.get('/api/serie/recommendedonsale', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRecommendedSeriesOnSale(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedSeriesByArtist
  app.get('/api/serie/recommendedartist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchRecommendedSeriesByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // load category
  app.get('/api/category/', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchCategory();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // numberOfLikedSeries

  app.get('/api/serie/likednumber/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.numberOfLikedSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // fetchLikedSeries
  app.get('/api/serie/liked/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLikedSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchHighestVolumeSeries
  app.get('/api/serie/highestvolume', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchHighestVolumeSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });


  // fetchLatestSerieByArtist
  app.get('/api/serie/latest/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLatestSerieByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchGallerySeries
  app.get('/api/serie/gallery', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchGallerySeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchLatestSeries
  app.get('/api/serie/serie/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchLatestSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // numberOfSeries
  app.get('/api/serie/totalnumber', [authJwt.verifySession], (req, res) => {
    const elements = controller.numberOfSeries(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // numberOfSeriesPerArstistId
  app.get('/api/serie/number/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.numberOfSeriesPerArstistId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // fetchRandomSerie
  app.get('/api/serie/random', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRandomSerie(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // setWhitelistSpotUsed
  app.post('/api/serie/whitelist/used/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.setWhitelistSpotUsed);

  // setWhitelistSpotPaid
  app.post('/api/serie/whitelist/paid/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.setWhitelistSpotPaid);

  // getWhitelisSpots
  app.get('/api/serie/getwhitelist', [authJwt.verifyToken, authJwt.isAdmin], controller.getWhitelisSpots);

  // updateOnSaleInscriptions
  // app.post('/api/serie/onsale/inscriptions', controller.updateOnSaleInscriptions);

  // percentageOfOwnership
  app.get('/api/serie/ownership/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.percentageOfOwnership);

  // volumeOfSerie
  app.get('/api/serie/volume/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.volumeOfSerie);

  // set views
  app.post('/api/serie/views/:id', [authJwt.verifySession], controller.setViews);

  // edit serie
  app.post('/api/serie/edit/:id', [authJwt.verifyToken, objectId.isValidObjectId, verifySerie.checkDuplicateNameEdit], controller.editSerie);

  // editUserSerie
  app.post('/api/serie/user/edit/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.editUserSerie);

  // set serie on sale
  app.post('/api/serie/onsale/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.setSerieOnSale);

  // set serie on display
  app.post('/api/serie/display/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.setSerieOnDisplay);

  // update serie
  app.post('/api/serie/update/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSerie);

  // update serie trait
  app.post('/api/serie/trait/update/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSerieTrait);

  // update serie category
  app.post('/api/serie/category/update/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSerieCategory);

  // updateSerieWhitelist
  app.post('/api/serie/whitelist/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSerieWhitelist);

  // editSerieName
  app.post('/api/serie/name/:id', [authJwt.verifyToken, objectId.isValidObjectId, verifySerie.checkDuplicateNameEdit], controller.editSerieName);

  // editSerieSubtitle
  app.post('/api/serie/subtitle/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editSerieSubtitle);

  // editSerieDescription
  app.post('/api/serie/description/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editSerieDescription);

  // update serie price
  app.post('/api/serie/price/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSeriePrice);

  // updateSeriePriceUSD
  app.post('/api/serie/priceusd/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSeriePriceUSD);

  // updateSerieRoyalty
  app.post('/api/serie/royalty/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSerieRoyalty);

  // updateSerieVolume
  app.post('/api/serie/volume/update/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.updateSerieVolume);

  // update serie total supply
  app.post('/api/serie/totalsupply/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateSerieTotalSupply);

  // update serie supply
  app.post('/api/serie/supply/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.updateSerieSupply);

  app.post('/api/serie/like/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.likeSerie);

  // createCategory
  app.post('/api/serie/category', [authJwt.verifyToken, authJwt.isAdmin], controller.createCategory);

  // toggleReviewSerie
  app.post('/api/serie/review/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.toggleReviewSerie);

  // remeoveWhitelistAddress
  // app.post('/api/serie/whitelist/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeWhitelistAddress);

  // set featured series
  // app.post('/api/serie/featured', [authJwt.verifyToken, authJwt.isAdmin], controller.setFeaturedSeries);

  // delete serie
  app.delete('/api/serie/user/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.deleteSerie);

  // adminDeleteSerie
  app.delete('/api/serie/admin/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.adminDeleteSerie);

  // deleteCategory
  app.delete('/api/serie/category/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.deleteCategory);

  // generateSlug
  // app.post('/api/serie/generateslug', controller.generateSlug);

  // updateSerieImageLink
  // app.post('/api/serie/image/update', controller.updateSerieImageLink);

  // updateSerieSketchUrl
  app.post('/api/serie/sketch/update', controller.updateSerieSketchUrl);

  // remove trait
  app.post('/api/serie/trait/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeSerieTrait);

  // remove category
  app.post('/api/serie/category/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeSerieCategory);

  // removeSerieTrait
  // app.delete('/api/exhibition/serie/trait/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeSerieTrait);

  // deleteSerieInscriptions
  // app.delete('/api/serie/deleteinscriptions', controller.deleteSerieInscriptions);
};
