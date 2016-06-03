'use strict';

/*
 global module,
 require
 */

var restify = require('restify');

var server = restify.createServer({
  name: 'testServer'
});


module.exports = server;
