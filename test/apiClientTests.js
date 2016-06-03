'use strict';

/*
 global module,
 require
 */


// bootstrap the webserver
require('./bootstrap');

// setup test frameworks
var chai           = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    expect         = chai.expect;

chai.use(chaiAsPromised);

// load the api client
var Robot = require('../index');

describe('Setup work', function() {
  it('Should not start without configuration', function() {
    var robotInstanceWithoutConfiguration = function() {
      new Robot();
    };

    expect(robotInstanceWithoutConfiguration).to.throw(Error, 'Missing configuration data');
  });

  it('Should not start without API username', function() {
    var robotInstanceWithoutValidConfiguration = function() {
      new Robot({});
    };

    expect(robotInstanceWithoutValidConfiguration).to.throw(Error, 'Missing API username');
  });

  it('Should not start without API password', function() {
    var robotInstanceWithoutValidConfiguration = function() {
      new Robot({
        username: 'foo'
      });
    };

    expect(robotInstanceWithoutValidConfiguration).to.throw(Error, 'Missing API password');
  });
});
