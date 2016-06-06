'use strict';

/*
 global module,
 require
 */


// bootstrap the webserver
var apiServer = require('./apiServer');

// setup test frameworks
var chai           = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    expect         = chai.expect;

chai.use(chaiAsPromised);

// load the api client
var Robot       = require('../index'),
    robotConfig = {
      username: 'test',
      password: 'test',
      baseUrl:  'http://localhost:8080'
    };

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

  it('Should start with API credentials', function() {
    var robot = new Robot({
      username: 'foo',
      password: 'bar'
    });

    expect(robot).to.be.an.instanceof(Robot);
  });
});

describe('Server instances', function() {
  it('Should not create a server instance without an IP', function() {
    var robot = new Robot(robotConfig);

    expect(robot.registerServer).to.throw(Error, 'Missing IP address');
  });

  it('Should create a server instance with an IP', function() {
    var robot = new Robot(robotConfig);

    var myServer = robot.registerServer('1.2.3.4');

    expect(myServer).to.have.property('identifiedServerInstance');
  });

  it('Should share properties across instances between the same IPs', function() {
    var robot = new Robot(robotConfig);

    // create the first instance of server with IP 1.2.3.4
    var firstInstanceOfMyServer = robot.registerServer('1.2.3.4');

    // attach a property to it
    firstInstanceOfMyServer.testProperty = 123;

    // create the second instance of server with IP 1.2.3.4
    var secondInstanceOfMyServer = robot.registerServer('1.2.3.4');

    // check if testProperty is also set on the new instance
    expect(secondInstanceOfMyServer).to.have.property('testProperty', 123);
  });
});

describe('StorageBox instances', function() {
  it('Should not create a storageBox instance without an ID', function() {
    var robot = new Robot(robotConfig);

    expect(robot.registerStorageBox).to.throw(Error, 'Missing storageBox ID');
  });

  it('Should create a storageBox instance with an ID', function() {
    var robot = new Robot(robotConfig);

    var myStorageBox = robot.registerStorageBox(1234);

    expect(myStorageBox).to.have.property('IdentifiedStorageBoxInstance');
  });

  it('Should share properties across instances between the same IDs', function() {
    var robot = new Robot(robotConfig);

    // create the first instance of storageBox with ID 1234
    var firstInstanceOfMyStorageBox = robot.registerStorageBox(1234);

    // attach a property to it
    firstInstanceOfMyStorageBox.testProperty = 'foo bar!';

    // create the second instance of storageBox with ID 1234
    var secondInstanceOfMyStorageBox = robot.registerStorageBox(1234);

    // check if testProperty is also set on the new instance
    expect(secondInstanceOfMyStorageBox).to.have.property('testProperty', 'foo bar!');
  });
});

describe('Server methods', function() {
  it('Should fetch information about all servers', function(done) {
    var robot = new Robot(robotConfig);

    expect(robot.queryServers())
      .to.eventually.deep.equal(apiServer.referenceDatabase[ 'test' ].servers).notify(done);
  });

  it('Should fetch information about an individual server', function(done) {
    var robot = new Robot(robotConfig);

    expect(robot.queryServer('123.123.123.123'))
      .to.eventually.deep.equal(apiServer.referenceDatabase[ 'test' ].servers[ 0 ]).notify(done);
  });

  it('Should change a server name', function(done) {
    var robot   = new Robot(robotConfig),
        newName = 'updatedTestName';

    robot.updateServerName('123.123.123.123', newName).then(function(response) {
      expect(robot.queryServer('123.123.123.123'))
        .to.eventually.have.deep.property('server.name', newName).notify(done);
    });
  });
});

describe('StorageBox methods', function() {
  it('Should fetch information about all storageBoxes', function(done) {
    var robot = new Robot(robotConfig);

    expect(robot.queryStorageBoxes())
      .to.eventually.deep.equal(apiServer.referenceDatabase[ 'test' ].storageBoxes).notify(done);
  });

  it('Should fetch information about an individual storageBox', function(done) {
    var robot = new Robot(robotConfig);

    expect(robot.queryStorageBox(123456)).to.eventually.deep.equal(apiServer.referenceDatabase[ 'test' ].storageBoxes[0]).notify(done);
  });

  it('Should change a storageBox name', function(done) {
    var robot   = new Robot(robotConfig),
        newName = 'updatedTestName';

    robot.updateStorageBoxName(123456, newName).then(function(response) {
      expect(robot.queryStorageBox(123456))
        .to.eventually.have.deep.property('storagebox.name', newName).notify(done);
    });
  });
});
