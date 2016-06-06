'use strict';

/*
 global module,
 require
 */

var restify = require('restify');

var apiCredentials = {
  username: 'test',
  password: 'test'
};

// create the pseudo API webserver
var server = restify.createServer({
  name: 'pseudo-hetzner-api'
});

// include the auth parser
server.use(restify.authorizationParser());
server.use(restify.bodyParser({
  mapParams: false
}));

/**
 * Authentication middleware: Sends a 401 to all unauthenticated requests
 */
server.use((req, res, next) => {
  if (req.username === 'anonymous') {
    return next(new restify.UnauthorizedError(''));
  }

  if (req.authorization.basic.username !== apiCredentials.username) {
    return next(new restify.UnauthorizedError(''));
  }

  if (req.authorization.basic.password !== apiCredentials.password) {
    return next(new restify.UnauthorizedError(''));
  }

  next();
});

/**
 * Mock up Configuration
 */
var clientsDatabase = {
  test: {
    network:      {
      ipAddresses: [
        {
          ip: {
            server_ip:        '123.123.123.123',
            server_number:    123,
            locked:           false,
            separate_mac:     null,
            traffic_warnings: false,
            traffic_hourly:   200,
            traffic_daily:    2000,
            traffic_monthly:  20
          }
        },
        {
          ip: {
            server_ip:        '124.124.124.124',
            server_number:    124,
            locked:           false,
            separate_mac:     null,
            traffic_warnings: false,
            traffic_hourly:   200,
            traffic_daily:    2000,
            traffic_monthly:  20
          }
        },
        {
          ip: {
            server_ip:        '125.125.125.125',
            server_number:    125,
            locked:           false,
            separate_mac:     null,
            traffic_warnings: false,
            traffic_hourly:   200,
            traffic_daily:    2000,
            traffic_monthly:  20
          }
        }
      ],
      subnets:     [],
      dnsEntries:  []
    },
    servers:      [
      {
        server: {
          server_ip:     '123.123.123.123',
          server_number: 123,
          product:       'DS 3000',
          dc:            6,
          traffic:       '5 TB',
          flatrate:      true,
          status:        'ready',
          throttled:     true,
          cancelled:     false,
          paid_until:    '2099-10-10'
        }
      },
      {
        server: {
          server_ip:     '124.124.124.124',
          server_number: 124,
          product:       'DS 3000',
          dc:            6,
          traffic:       '5 TB',
          flatrate:      true,
          status:        'ready',
          throttled:     true,
          cancelled:     false,
          paid_until:    '2099-10-10'
        }
      },
      {
        server: {
          server_ip:     '125.125.125.125',
          server_number: 125,
          product:       'DS 3000',
          dc:            6,
          traffic:       '5 TB',
          flatrate:      true,
          status:        'ready',
          throttled:     true,
          cancelled:     false,
          paid_until:    '2099-10-10'
        }
      }
    ],
    storageBoxes: [
      {
        storagebox: {
          id:         123456,
          login:      'test',
          name:       'test-box-1',
          product:    'EX40',
          cancelled:  false,
          paid_until: '2099-10-10'
        }
      },
      {
        storagebox: {
          id:         123457,
          login:      'test',
          name:       'test-box-2',
          product:    'EX40',
          cancelled:  false,
          paid_until: '2099-10-10'
        }
      },
      {
        storagebox: {
          id:         123458,
          login:      'test',
          name:       'test-box-3',
          product:    'EX40',
          cancelled:  false,
          paid_until: '2099-10-10'
        }
      }
    ],
    vServers:     [],
    sshKeys:      [],
    snapshots:    [],
    transactions: []
  }
},
    apiData         = {
      bootConfigurationStore: {},
      products:               {},
      marketProducts:         {}
    },
    util            = {
      getStorageBoxById: function(req, res, callback) {

        // query client data from the mockup database
        var clientData = clientsDatabase[ req.username ];

        if (clientData.storageBoxes.length === 0) {
          res.send(404, {
            error: {
              status:  404,
              code:    'NOT_FOUND',
              message: 'No storagebox found'
            }
          });
        }

        for (var i = 0; i < clientData.storageBoxes.length; i++) {
          if (parseInt(req.params.id) === clientData.storageBoxes[ i ].storagebox.id) {
            return callback(clientData.storageBoxes[ i ]);
          }
        }

        res.send(404, {
          error: {
            status:  404,
            code:    'STORAGEBOX_NOT_FOUND',
            message: 'Storagebox with ID ' + req.params.id + ' not found'
          }
        });
      },
      getServerByIp:     function(req, res, callback) {

        // query client data from the mockup database
        var clientData = clientsDatabase[ req.username ];

        if (clientData.servers.length === 0) {
          res.send(404, {
            error: {
              status:  404,
              code:    'NOT_FOUND',
              message: 'No server found'
            }
          });
        }

        for (var i = 0; i < clientData.servers.length; i++) {
          if (req.params.ipAddress === clientData.servers[ i ].server.server_ip) {
            return callback(clientData.servers[ i ]);
          }
        }

        res.send(404, {
          error: {
            status:  404,
            code:    'SERVER_NOT_FOUND',
            message: 'Server with IP ' + req.params.ipAddress + ' not found'
          }
        });
      }

    };

server.referenceDatabase = clientsDatabase;

/**
 * Server routes
 */
server.get('/server', function(req, res, next) {

  // query client data from the mockup database
  var clientData = clientsDatabase[ req.username ];

  if (clientData.servers.length === 0) {
    res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'No server found'
      }
    });
  }

  res.send(clientData.servers);
});

server.get('/server/:ipAddress', function(req, res, next) {

  // query client data from the mockup database
  var clientData = clientsDatabase[ req.username ];

  if (clientData.servers.length === 0) {
    res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'No server found'
      }
    });
  }

  for (var i = 0; i < clientData.servers.length; i++) {
    if (req.params.ipAddress === clientData.servers[ i ].server.server_ip) {
      res.send(clientData.servers[ i ]);
      break;
    }
  }

  res.send(404, {
    error: {
      status:  404,
      code:    'SERVER_NOT_FOUND',
      message: 'Server with IP ' + req.params.ipAddress + ' not found'
    }
  });
});

server.post('/server/:ipAddress', function(req, res, next) {
  if (typeof req.body.server_name !== 'string') {
    res.send(400, {
      error: {
        status:  400,
        code:    'INVALID_INPUT',
        message: 'Invalid input parameters'
      }
    });
  }

  util.getServerByIp(req, res, function(data) {
    data.server.name = req.body.server_name;

    res.send([
      data
    ]);
  });
});

server.get('/storagebox', function(req, res, next) {

  // query client data from the mockup database
  var clientData = clientsDatabase[ req.username ];

  if (clientData.storageBoxes.length === 0) {
    res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'No storagebox found'
      }
    });
  }

  res.send(clientData.storageBoxes);
});

server.get('/storagebox/:id', function(req, res, next) {
  util.getStorageBoxById(req, res, function(data) {
    res.send(data);
  });
});

server.post('/storagebox/:id', function(req, res, next) {
  if (typeof req.body.storagebox_name !== 'string') {
    res.send(400, {
      error: {
        status:  400,
        code:    'INVALID_INPUT',
        message: 'Invalid input parameters'
      }
    });
  }

  util.getStorageBoxById(req, res, function(data) {
    data.storagebox.name = req.body.storagebox_name;

    res.send([
      data
    ]);
  });
});

server.get('/reset', function(req, res, next) {

});

server.get('/reset/:ipAddress', function(req, res, next) {

});

/**
 * 401 Error handler, mimicking the Hetzner API
 */
server.on('Unauthorized', function(req, res, error, next) {
  error.body = {
    error: {
      status:  401,
      code:    'UNAUTHORIZED',
      message: 'Unauthorized'
    }
  };

  next();
});

/**
 * 500 Error handler, mimicking the Hetzner API
 */
server.on('InternalServer', function(req, res, error, next) {
  error.body = {
    error: {
      status:  500,
      code:    'INTERNAL_ERROR',
      message: 'Some error occurred on the pseudo-hetzner API'
    }
  };

  return next();
});

/**
 * 404 Error handler, mimicking the Hetzner API
 */
server.on('NotFound', function(req, res, error, next) {
  error.body = {
    error: {
      status:  404,
      code:    'NOT_FOUND',
      message: 'Not Found'
    }
  };

  // awkward workaround since calling next only seems to cause a loop
  res.send(404, error);
  next();
});


// listen on port 8080
server.listen(8080);

module.exports = server;
