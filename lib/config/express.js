'use strict';

var express = require('express'),
    path = require('path'),
    passport = require('passport'),
    config = require('./config'),
    redis = require('redis'),
    RedisStore = require('connect-redis')(express);

/**
 * Express configuration
 */
module.exports = function(app) {
  app.configure('development', function(){
    app.use(require('connect-livereload')());

    // Disable caching of scripts for easier testing
    app.use(function noCache(req, res, next) {
      if (req.url.indexOf('/scripts/') === 0) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', 0);
      }
      next();
    });

    app.use(express.static(path.join(config.root, '.tmp')));
    app.use(express.static(path.join(config.root, 'app')));
    app.use(express.errorHandler());
    app.set('views', config.root + '/app/views');
  });

  app.configure('production', function(){
    app.use(express.favicon(path.join(config.root, 'public', 'favicon.ico')));
    app.use(express.compress());
    app.use(express.static(path.join(config.root, 'public'), { maxAge: 604800000 }));
    app.set('views', config.root + '/views');
  });

  app.configure(function(){
    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'html');
    app.use(express.logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.use(express.cookieParser());

    var csrfValue = function(req) {
    var token = (req.body && req.body._csrf)
      || (req.query && req.query._csrf)
      || (req.headers['x-csrf-token'])
      || (req.headers['x-xsrf-token']);
      return token;
    };


  	if(config.redis) {
      var redisClient = redis.createClient(config.redis.port, config.redis.host);
      redisClient.auth(config.redis.password);

      redisClient.on('ready', function() {
        console.log("Readis is ready.");
      });

      app.use(express.session({
        store: new RedisStore({
          client: redisClient
        }),
        secret: config.sessionSecret
      }));
  	} else {
      app.use(express.session({
        secret: config.sessionSecret
      }));
    }

    app.use(express.csrf({value: csrfValue}));
    app.use(function(req, res, next) {
      res.cookie('XSRF-TOKEN', req.csrfToken());
      next();
    });

    // Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Router needs to be last
    app.use(app.router);
  });
};