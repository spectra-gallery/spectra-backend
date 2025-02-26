/* eslint-disable max-len */
const {authJwt} = require('../middlewares');

const db = require('../models');
const Twitter = db.twitter;
const Discord = db.discord;
const User = db.user;

require('dotenv').config();

const session = require('express-session');
const MongoStore = require('connect-mongo');
// const mongoose = require('mongoose');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter');
const DiscordStrategy = require('passport-discord');

const BASE_URL = process.env.BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: `${BASE_URL}api/twitter/return`,
},
function(token, tokenSecret, profile, cb) {
  const user = {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
  };
  cb(null, user);
}));

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: `${BASE_URL}api/discord/return`,
  scope: ['identify'], // Adjust scopes as needed
},
function(accessToken, refreshToken, profile, cb) {
  // Here, you would find or create a user in your database
  const user = {
    id: profile.id,
    username: profile.username,
  };
  cb(null, user);
},
));
/*
passport.use(new InstagramStrategy({
  clientID: process.env.INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  callbackURL: 'https://api.function.gallery/api/instagram/return',
  scope: ['user_profile'], // Adjust scopes as needed
},
function(accessToken, refreshToken, profile, done) {
  console.log(profile);
  return done(err, profile);
},
));
*/
passport.serializeUser(function(user, cb) {
  cb(null, user);
},
);

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
},

);

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'x-refresh-token, Origin, Content-Type, Accept',
        'session-token, Origin, Content-Type, Accept',
        'session-refresh, Origin, Content-Type, Accept'
    );
    next();
  });
  app.use(require('cookie-parser')());
  // app.use(bodyParser.urlencoded({extended: true}));
  const dbConfig = require('../config/db.config');
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_here',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: false, // process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // when login failed, send failed msg
  app.get('/api/twitter/login/failed', (req, res) => {
    /*
    res.status(401).json({
      success: false,
      message: 'user failed to authenticate.',
    }); */
    res.redirect(`${CLIENT_URL}user/edit/`);
  });

  app.get('/api/twitter/disconnect', [authJwt.verifyToken], (req, res, next) => {
    const userId = req.userId;
    /*
            const token = jwt.sign({id: userId}, config.secret, {
              expiresIn: config.jwtExpiration, // 24 hours
            });
            */

    res.status(200).send({
      url: BASE_URL + 'api/twitter/logout/'+ userId,
    });
  });

  // twitter logout
  app.get('/api/twitter/logout/:userId', (req, res) => {
    const userId = req.params.userId;

    User.findById(userId, (err, user) => {
      if (err) {
        res.status(500).send({message: err});
        return;
      }
      user.twitter = null;
      user.save((err, user) => {
        if (err) {
          res.status(500).send({message: err});
          return;
        }
        req.logout(function(err) {
          if (err) {
            return next(err);
          }
          res.redirect(`${CLIENT_URL}user/edit/`);
        });
      });
    });
  });

  app.get('/api/twitter/auth', [authJwt.verifyToken], (req, res, next) => {
    const userId = req.userId;
    /*
    const token = jwt.sign({id: userId}, config.secret, {
      expiresIn: config.jwtExpiration, // 24 hours
    });
    */

    res.status(200).send({
      url: BASE_URL + 'api/twitter/login/'+ userId,
    });
  });

  app.get('/api/twitter/login/:userId', (req, res, next) => {
    req.session.userId = req.params.userId;
    passport.authenticate('twitter')(req, res, next);
  });

  app.get(
      '/api/twitter/return', function(req, res, next) {
        const userId = req.session.userId;
        passport.authenticate('twitter', function(err, user, info) {
          if (err) {
            return next(err);
          }
          if (!user) {
            return res.redirect(`${BASE_URL}api/twitter/login/failed`);
          }
          req.logIn(user, function(err) {
            if (err) {
              return next(err);
            }

            const twitter = new Twitter({
              id: req.user.id,
              username: req.user.username,
              displayName: req.user.displayName,
            });
            twitter.save((err, twitter) => {
              if (err) {
                res.status(500).send({message: err});
                return;
              }

              User.findById(userId, (err, user) => {
                if (err) {
                  res.status(500).send({message: err});
                  return;
                }
                user.twitter = twitter._id;
                user.save((err, user) => {
                  if (err) {
                    res.status(500).send({message: err});
                    return;
                  }
                  return res.redirect(`${CLIENT_URL}user/edit/`);
                });
              });
            });
          });
        })(req, res, next);
      });

  app.get('/api/discord/login/failed', (req, res) => {
    /*
        res.status(401).json({
          success: false,
          message: 'user failed to authenticate.',
        }); */
    res.redirect(`${CLIENT_URL}user/edit/`);
  });

  app.get('/api/discord/disconnect', [authJwt.verifyToken], (req, res, next) => {
    const userId = req.userId;
    /*
            const token = jwt.sign({id: userId}, config.secret, {
              expiresIn: config.jwtExpiration, // 24 hours
            });
            */

    res.status(200).send({
      url: BASE_URL + 'api/discord/logout/'+ userId,
    });
  });

  // discord logout
  app.get('/api/discord/logout/:userId', (req, res) => {
    const userId = req.params.userId;

    User.findById(userId, (err, user) => {
      if (err) {
        res.status(500).send({message: err});
        return;
      }
      user.discord = null;
      user.save((err, user) => {
        if (err) {
          res.status(500).send({message: err});
          return;
        }
        req.logout(function(err) {
          if (err) {
            return next(err);
          }
          res.redirect(`${CLIENT_URL}user/edit/`);
        });
      });
    });
  });

  app.get('/api/discord/auth', [authJwt.verifyToken], (req, res, next) => {
    const userId = req.userId;
    /*
        const token = jwt.sign({id: userId}, config.secret, {
          expiresIn: config.jwtExpiration, // 24 hours
        });
        */

    res.status(200).send({
      url: BASE_URL + 'api/discord/login/'+ userId,
    });
  });

  app.get('/api/discord/login/:userId', (req, res, next) => {
    req.session.userId = req.params.userId;
    passport.authenticate('discord')(req, res, next);
  });
  app.get('/api/discord/return', function(req, res, next) {
    const userId = req.session.userId;
    passport.authenticate('discord', function(err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect(`${BASE_URL}api/discord/login/failed`);
      }
      req.logIn(user, function(err) {
        if (err) {
          return next(err);
        }

        const discord = new Discord({
          id: req.user.id,
          username: req.user.username,
        });
        discord.save((err, discord) => {
          if (err) {
            res.status(500).send({message: err});
            return;
          }

          User.findById(userId, (err, user) => {
            if (err) {
              res.status(500).send({message: err});
              return;
            }
            user.discord = discord._id;
            user.save((err, user) => {
              if (err) {
                res.status(500).send({message: err});
                return;
              }
              return res.redirect(`${CLIENT_URL}user/edit/`);
            });
          });
        });
      });
    })(req, res, next);
  });

/*
  app.get('/api/instagram/auth', (req, res, next) => {
    // const userId = req.userId;

    res.redirect(`https://api.instagram.com/oauth/authorize
      ?client_id=${process.env.INSTAGRAM_CLIENT_ID}
      &redirect_uri=https://api.function.gallery/api/instagram/return/
      &scope=user_profile
      &response_type=code`,
    );
  });

  app.get('/api/instagram/return', (req, res, next) => {
    const code = req.query.code;
    console.log('code', code);
    const url = `https://api.instagram.com/oauth/access_token`;
    const data = {
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: 'https://api.function.gallery/api/instagram/return',
      code: code,
    };

    axios.post(url, data)
        .then((response) => {
          console.log(response.data);

        })
        .catch((error) => {
          console.log(error);
        });
  });
  */
};
