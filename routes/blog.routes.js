/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const {objectId} = require('../middlewares');
const {verifyPost} = require('../middlewares');
const controller = require('../controllers/blog.controller');
const uploadController = require('../controllers/fileUpload.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'x-refresh-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
        'session-refresh, Origin, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    // x-frame-options sameorigin
    res.header('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.use('/api/blog', (req, res, next) => {
    req.target = 'post';
    next();
  });

  // slugToId
  app.get('/api/blog/slug/:slug', controller.slugToId);

  // slugPodToId
  app.get('/api/blog/pod/slug/:slug', controller.slugPodToId);

  // fetchPostName
  app.get('/api/blog/name', [authJwt.verifyToken], (req, res) => {
    const elements = controller.fetchPostName(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // create blog
  // app.post('/api/blog', [authJwt.verifyToken, authJwt.isCreator, verifyPost.checkDuplicateName], controller.createPost);

  app.post('/api/blog', [authJwt.verifyToken, authJwt.isThinker, verifyPost.checkDuplicateName], controller.createPost);

  app.post('/api/blog/podcast', [authJwt.verifyToken, authJwt.isThinker, verifyPost.checkDuplicateName], controller.createPodcast);

  // createUserPost
  app.post('/api/blog/user', [authJwt.verifyToken, authJwt.isAdmin], controller.createUserPost);


  // commentPost
  app.post('/api/blog/comment/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.commentPost);

  app.post('/api/blog/podcast/comment/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.commentPodcast);

  // postSpectrum
  // app.post('/api/blog/spectrum/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.postSpectrum);

  // get all series by page
  app.get('/api/blog/all/:page', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // getAllPosts
  app.get('/api/blog/list', [authJwt.verifySession], (req, res) => {
    const elements = controller.getAllPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });
  // fetchAllPostsByNumber
  app.get('/api/blog/allnumber/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchAllPostsByNumber(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchAllPostsByCategory
  app.get('/api/blog/category/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchAllPostsByCategory(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchAllPostsByCategories
  app.get('/api/blog/categories/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchAllPostsByCategories(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get blog by id
  app.get('/api/blog/blogid/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchPostById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchPodcastById
  app.get('/api/blog/podcastid/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchPodcastById(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get blog by artist
  app.get('/api/blog/artist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchPostByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get('/api/blog/podcast/artist/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchPodcastByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // get my blog
  app.get('/api/blog/my', [authJwt.verifySession, authJwt.isAuthorOrAllowed], (req, res) => {
    const elements = controller.fetchMyPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get('/api/blog/media', (req, res) => {
    const elements = controller.fetchAllMedias();
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });


  // fetch featured series
  app.get('/api/blog/featured', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchFeaturedPosts(req, res);
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

  // createReview
  app.post('/api/blog/spectre/create/:id', [authJwt.verifyToken, authJwt.isAllowedReviewer, objectId.isValidObjectId], controller.createReview);

  // updateSpectre
  app.post('/api/blog/spectre/update/:id', [authJwt.verifyToken, authJwt.isAllowedReviewer, objectId.isValidObjectId], controller.updateSpectre);

  // fetchSpectrum
  app.get('/api/blog/spectrum', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchSpectrumReviews(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // numberOfLikedPosts

  app.get('/api/blog/likednumber/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.numberOfLikedPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // fetchLikedPosts
  app.get('/api/blog/liked/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLikedPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });


  // fetchLatestPostByArtist
  app.get('/api/blog/latest/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLatestPostByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get('/api/blog/podcast/latest/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.fetchLatestPodcastByArtist(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchGalleryPosts
  app.get('/api/blog/gallery', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchGalleryPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchLatestPosts
  app.get('/api/blog/post/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchLatestPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // fetchLatestPodcats
  app.get('/api/blog/podcast/:number', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchLatestPodcasts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  // numberOfPosts
  app.get('/api/blog/totalnumber', [authJwt.verifySession], (req, res) => {
    const elements = controller.numberOfPosts(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // numberOfPostsPerArstistId
  app.get('/api/blog/number/:id', [authJwt.verifySession, objectId.isValidObjectId], (req, res) => {
    const elements = controller.numberOfPostsPerArstistId(req, res);
    elements.then((elements) => {
      res.status(200).send({
        number: elements,
      });
    });
  });

  // fetchRandomPost
  app.get('/api/blog/random', [authJwt.verifySession], (req, res) => {
    const elements = controller.fetchRandomPost(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get("/api/blog/sections/:id", (req, res) => {
    const elements = controller.fetchSections(req, res);
    elements.then((elements) => {
      res.status(200).send({
        ...elements,
      });
    });
  });

  app.get("/api/blog/section/:id", (req, res) => {
    const element = controller.fetchSection(req, res);
    element.then((elementObj) => {
      res.status(200).send({
        ...elementObj,
      });
    });
  });


  // set views
  app.post('/api/blog/views/:id', [authJwt.verifySession, objectId.isValidObjectId], controller.setViews);

  // edit blog
  app.post('/api/blog/edit/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId, verifyPost.checkDuplicateNameEdit], controller.editPost);

  // editUserPost
  // app.post('/api/blog/user/edit/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.editUserPost);


  // set blog on display
  app.post('/api/blog/display/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.setPostOnDisplay);

  // editPostMedia
  app.post('/api/blog/media/edit/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPostMedia);

  // update blog category
  app.post('/api/blog/category/update/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.updatePostCategory);

  // editPostName
  app.post('/api/blog/name/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId, verifyPost.checkDuplicateNameEdit], controller.editPostName);

  // editPostSubtitle
  app.post('/api/blog/subtitle/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPostSubtitle);

  // editPostDescription
  app.post('/api/blog/description/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPostDescription);

  // editPostName
  app.post('/api/blog/podcast/name/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId, verifyPost.checkDuplicateNameEdit], controller.editPodcastName);

  // editPostSubtitle
  app.post('/api/blog/podcast/subtitle/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPodcastSubtitle);

  // editPostDescription
  app.post('/api/blog/podcast/description/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPodcastDescription);

  // editPodcastAudio
  app.post('/api/blog/podcast/audio/edit/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPodcastAudio);

  // editPodcastMedia
  app.post('/api/blog/podcast/media/edit/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editPodcastMedia);

  app.post('/api/blog/like/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.likePost);

  // likePodcast
  app.post('/api/blog/podcast/like/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.likePodcast);

  // createCategory
  app.post('/api/blog/category', [authJwt.verifyToken, authJwt.isAdmin], controller.createCategory);

  // toggleReviewPost
  app.post('/api/blog/review/:id', [authJwt.verifyToken, authJwt.isAllowedReviewer, objectId.isValidObjectId], controller.toggleReviewPost);

  app.post(
    "/api/blog/section",
    [authJwt.verifyToken, authJwt.isThinker, authJwt.getUsername],
    controller.createSection
  );

  app.post(
    "/api/blog/section/edit/:id",
    [authJwt.verifyToken, authJwt.isAuthorOrAllowed, authJwt.getUsername],
    controller.editSection
  );

  //  editSectionTitle
    app.post('/api/blog/section/title/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editSectionTitle);

    // editSectionContent
    app.post('/api/blog/section/content/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editSectionContent);

    // editSectionImageUrl
    app.post('/api/blog/section/image/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.editSectionImageUrl);

    // updateSectionList
    app.post('/api/blog/section/update/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.updateSectionList);

    // deleteSection
    app.delete('/api/blog/section/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.deleteSection);

  // remeoveWhitelistAddress
  // app.post('/api/blog/whitelist/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removeWhitelistAddress);

  // set featured series
  // app.post('/api/blog/featured', [authJwt.verifyToken, authJwt.isAdmin], controller.setFeaturedPosts);

  // delete blog
  app.delete('/api/blog/user/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.deletePost);

  // adminDeletePost
  // app.delete('/api/blog/admin/:id', [authJwt.verifyToken, authJwt.isAdmin, objectId.isValidObjectId], controller.adminDeletePost);

  // deleteCategory
  app.delete('/api/blog/category/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.deleteCategory);


  // remove category
  app.post('/api/blog/category/remove/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.removePostCategory);

  // remove comment
  app.delete('/api/blog/comment/:id', [authJwt.verifyToken, authJwt.isAuthorOrAllowed, objectId.isValidObjectId], controller.removeComment);

  // removePostTrait
  // app.delete('/api/exhibition/blog/trait/remove/:id', [authJwt.verifyToken, objectId.isValidObjectId], controller.removePostTrait);

  // deletePostInscriptions
  // app.delete('/api/blog/deleteinscriptions', controller.deletePostInscriptions);
};