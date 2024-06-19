/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const {verifyCollection} = require('../middlewares');
const controller = require('../controllers/generative.controller');
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
  app.get('/api/generative/slug/:slug', controller.slugToId);

  // create generative
  app.post('/api/generative', [authJwt.verifyToken, authJwt.isCreator, verifyCollection.checkDuplicateName], controller.createCollection);

  // createUserCollection
  app.post('/api/generative/user', [authJwt.verifyToken, authJwt.isAdmin], controller.createUserCollection);

  // generateSketch
  app.post('/api/generative/sketch', [authJwt.verifyToken], controller.generateSketch);

  // upload generative sketch data
  app.post('/api/generative/data', [authJwt.verifyToken], uploadController.htmlUpload);

  // generative html to img
  app.post('/api/generative/generate', [authJwt.verifyToken], uploadController.htmlToImg);

  // get all collections by page
  app.get('/api/generative/all/:page', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getAllCollections
  app.get('/api/generative/list', [authJwt.verifySession], (req, res) => {
    const elements = controller.getAllCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });
  // fetchAllCollectionsByNumber
  app.get('/api/generative/allnumber/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchAllCollectionsByNumber(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get generative by id
  app.get('/api/collectionid/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchCollectionById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get generative by artist
  app.get('/api/generative/artist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchCollectionByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchOnSaleCollections
  app.get('/api/generative/onsale', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchOnSaleCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetch featured collections
  app.get('/api/generative/featured', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchFeaturedCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchTrendingCollections
  app.get('/api/generative/trending', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchTrendingCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedCollections
  app.get('/api/generative/recommended', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRecommendedCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedCollectionsOmitArtist
  app.get('/api/generative/recommendedomitartist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchRecommendedCollectionsOmitArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedCollectionsOnSale
  app.get('/api/generative/recommendedonsale', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRecommendedCollectionsOnSale(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchRecommendedCollectionsByArtist
  app.get('/api/generative/recommendedartist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchRecommendedCollectionsByArtist(req, res);
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

  // numberOfLikedCollections

  app.get('/api/generative/likednumber/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.numberOfLikedCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // fetchLikedCollections
  app.get('/api/generative/liked/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLikedCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchHighestVolumeCollections
  app.get('/api/generative/highestvolume', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchHighestVolumeCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });


  // fetchLatestCollectionByArtist
  app.get('/api/generative/latest/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLatestCollectionByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchGalleryCollections
  app.get('/api/generative/gallery', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchGalleryCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchLatestCollections
  app.get('/api/generative/generative/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchLatestCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // numberOfCollections
  app.get('/api/generative/totalnumber', [authJwt.verifySession], (req, res) => {
    const elements = controller.numberOfCollections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // numberOfCollectionsPerArstistId
  app.get('/api/generative/number/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.numberOfCollectionsPerArstistId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // fetchRandomCollection
  app.get('/api/generative/random', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRandomCollection(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // setWhitelistSpotUsed
  app.post('/api/generative/whitelist/used/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.setWhitelistSpotUsed);

  // setWhitelistSpotPaid
  app.post('/api/generative/whitelist/paid/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.setWhitelistSpotPaid);

  // getWhitelisSpots
  app.get('/api/generative/getwhitelist', [authJwt.verifyToken, authJwt.isAdmin], controller.getWhitelisSpots);

  // updateOnSaleInscriptions
  // app.post('/api/generative/onsale/inscriptions', controller.updateOnSaleInscriptions);

  // percentageOfOwnership
  app.get('/api/generative/ownership/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.percentageOfOwnership);

  // volumeOfCollection
  app.get('/api/generative/volume/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.volumeOfCollection);

  // set views
  app.post('/api/generative/views/:id', [authJwt.verifySession], controller.setViews);

  // edit generative
  app.post('/api/generative/edit/:id', [authJwt.verifyToken, objectId.isValidObjectId, verifyCollection.checkDuplicateNameEdit], controller.editCollection);

  // editUserCollection
  app.post('/api/generative/user/edit/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.editUserCollection);

  // set generative on sale
  app.post('/api/generative/onsale/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.setCollectionOnSale);

  // update generative
  app.post('/api/generative/update/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateCollection);

  // updateCollectionWhitelist
  app.post('/api/generative/whitelist/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.updateCollectionWhitelist);

  // editCollectionDescription
  app.post('/api/generative/description/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.editCollectionDescription);

  app.post('/api/generative/like/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.likeCollection);

  // createCategory
  app.post('/api/generative/category', [authJwt.verifyToken, authJwt.isAdmin], controller.createCategory);

  // remeoveWhitelistAddress
  // app.post('/api/generative/whitelist/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeWhitelistAddress);

  // set featured collections
  app.post('/api/generative/featured', [authJwt.verifyToken, authJwt.isAdmin], controller.setFeaturedCollections);

  // delete generative
  app.delete('/api/generative/user/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.deleteCollection);

  // adminDeleteCollection
  app.delete('/api/generative/admin/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.adminDeleteCollection);

  // deleteCategory
  app.delete('/api/generative/category/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.deleteCategory);

  // generateSlug
  // app.post('/api/generative/generateslug', controller.generateSlug);

  // updateCollectionImageLink
  // app.post('/api/generative/image/update', controller.updateCollectionImageLink);

  // updateCollectionSketchUrl
  app.post('/api/generative/sketch/update', controller.updateCollectionSketchUrl);

  // deleteCollectionInscriptions
  // app.delete('/api/generative/deleteinscriptions', controller.deleteCollectionInscriptions);
};
