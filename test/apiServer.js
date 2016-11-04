'use strict';

/*
 global module,
 require
 */

const restify        = require('restify');
const apiCredentials = {
  username: 'test',
  password: 'test'
};

// create the pseudo API webserver
const server = restify.createServer({
  name: 'pseudo-hetzner-api'
});

// include the auth parser
server.use(restify.authorizationParser());
server.use(restify.bodyParser({
  mapParams: true
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
const clientsDatabase = {
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
          server_name:   'server1',
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
          server_name:   'server2',
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
          server_name:   'server3',
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
          paid_until: '2099-10-10',
          snapshots:  [
            {
              snapshot: {
                name:      '2015-12-21T12-40-38',
                timestamp: '2015-12-21T13:40:38+01:00',
                size:      400
              }
            },
            {
              snapshot: {
                name:      '2015-12-21T12-40-39',
                timestamp: '2015-12-21T13:40:39+01:00',
                size:      420
              }
            },
            {
              snapshot: {
                name:      '2015-12-21T12-40-41',
                timestamp: '2015-12-21T13:40:41+01:00',
                size:      450
              }
            }
          ]
        }
      },
      {
        storagebox: {
          id:         123457,
          login:      'test',
          name:       'test-box-2',
          product:    'EX40',
          cancelled:  false,
          paid_until: '2099-10-10',
          snapshots:  [
            {
              snapshot: {
                name:      '2015-12-21T12-40-38',
                timestamp: '2015-12-21T13:40:38+01:00',
                size:      400
              }
            },
            {
              snapshot: {
                name:      '2015-12-21T12-40-39',
                timestamp: '2015-12-21T13:40:39+01:00',
                size:      420
              }
            },
            {
              snapshot: {
                name:      '2015-12-21T12-40-41',
                timestamp: '2015-12-21T13:40:41+01:00',
                size:      450
              }
            }
          ]

        }
      },
      {
        storagebox: {
          id:         123458,
          login:      'test',
          name:       'test-box-3',
          product:    'EX40',
          cancelled:  false,
          paid_until: '2099-10-10',
          snapshots:  [
            {
              snapshot: {
                name:      '2015-12-21T12-40-38',
                timestamp: '2015-12-21T13:40:38+01:00',
                size:      400
              }
            },
            {
              snapshot: {
                name:      '2015-12-21T12-40-39',
                timestamp: '2015-12-21T13:40:39+01:00',
                size:      420
              }
            },
            {
              snapshot: {
                name:      '2015-12-21T12-40-41',
                timestamp: '2015-12-21T13:40:41+01:00',
                size:      450
              }
            }
          ]
        }
      }
    ],
    vServers:     [
      {
        vserver: {
          name:       'vserver-1',
          vserver_ip: '223.223.223.223',
          online:     true
        }
      },
      {
        vserver: {
          name:       'vserver-2',
          vserver_ip: '224.224.224.224',
          online:     true
        }
      },
      {
        vserver: {
          name:       'vserver-3',
          vserver_ip: '225.225.225.225',
          online:     false
        }
      }
    ],
    sshKeys:      [
      {
        key: {
          name:        'key1',
          fingerprint: '56:29:99:a4:5d:ed:ac:95:c1:f5:88:82:90:5d:dd:10',
          type:        'ECDSA',
          size:        521,
          data:        'ecdsa-sha2-nistp521 AAAAE2VjZHNh ...'
        }
      },
      {
        key: {
          name:        'key2',
          fingerprint: '15:28:b0:03:95:f0:77:b3:10:56:15:6b:77:22:a5:bb',
          type:        'ED25519',
          size:        256,
          data:        'ssh-ed25519 AAAAC3NzaC1 ...'
        }
      }
    ],
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
        getStorageBoxById:      function(req, res, callback) {

          // query client data from the mockup database
          var clientData = clientsDatabase[ req.username ];

          if (clientData.storageBoxes.length === 0) {
            return res.send(404, {
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

          return res.send(404, {
            error: {
              status:  404,
              code:    'STORAGEBOX_NOT_FOUND',
              message: 'Storagebox with ID ' + req.params.id + ' not found'
            }
          });
        },
        getServerByIp:          function(req, res, callback) {

          // query client data from the mockup database
          var clientData = clientsDatabase[ req.username ];

          if (clientData.servers.length === 0) {
            return res.send(404, {
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

          return res.send(404, {
            error: {
              status:  404,
              code:    'SERVER_NOT_FOUND',
              message: 'Server with IP ' + req.params.ipAddress + ' not found'
            }
          });
        },
        getSSHKeyByFingerprint: function(req, res, callback) {
          var sshKeys = clientsDatabase[ req.username ].sshKeys;

          if (sshKeys.length === 0) {
            return res.send(404, {
              error: {
                status:  404,
                code:    'NOT_FOUND',
                message: 'No keys found'
              }
            })
          }

          for (var i = 0; i < sshKeys.length; i++) {
            if (sshKeys[ i ].key.fingerprint === req.params.fingerprint) {
              return callback([
                sshKeys[ i ]
              ]);
            }
          }

          return res.send(404, {
            error: {
              status:  404,
              code:    'NOT_FOUND',
              message: 'Key not found'
            }
          })
        }
      };

server.referenceDatabase = clientsDatabase;

/**
 * Server API methods
 */
server.get('/server', function(req, res, next) {

  // query client data from the mockup database
  var clientData = clientsDatabase[ req.username ];

  if (clientData.servers.length === 0) {
    return res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'No server found'
      }
    });
  }

  return res.send(clientData.servers);
});

server.get('/server/:ipAddress', function(req, res, next) {

  // query client data from the mockup database
  var clientData = clientsDatabase[ req.username ];

  if (clientData.servers.length === 0) {
    return res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'No server found'
      }
    });
  }

  for (var i = 0; i < clientData.servers.length; i++) {
    if (req.params.ipAddress === clientData.servers[ i ].server.server_ip) {
      return res.send(clientData.servers[ i ]);
    }
  }

  return res.send(404, {
    error: {
      status:  404,
      code:    'SERVER_NOT_FOUND',
      message: 'Server with IP ' + req.params.ipAddress + ' not found'
    }
  });
});

server.post('/server/:ipAddress', function(req, res, next) {
  if (typeof req.params.server_name !== 'string') {
    return res.send(400, {
      error: {
        status:  400,
        code:    'INVALID_INPUT',
        message: 'Invalid input parameters'
      }
    });
  }

  util.getServerByIp(req, res, function(data) {
    data.server.server_name = req.params.server_name;

    return res.send([
      data
    ]);
  });
});


/**
 * Storagebox API methods
 */
server.get('/storagebox', function(req, res, next) {

  // query client data from the mockup database
  var clientData   = clientsDatabase[ req.username ],
      storageBoxes = [];

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
    var current = clientData.storageBoxes[ i ].storagebox;

    storageBoxes.push({
      storagebox: {
        id:         current.id,
        login:      current.login,
        name:       current.name,
        product:    current.product,
        cancelled:  current.cancelled,
        paid_until: current.paid_until
      }
    });
  }

  res.send(storageBoxes);
});

server.get('/storagebox/:id', function(req, res, next) {
  util.getStorageBoxById(req, res, function(data) {
    var current    = data.storagebox,
        storageBox = [];

    storageBox.push({
      storagebox: {
        id:         current.id,
        login:      current.login,
        name:       current.name,
        product:    current.product,
        cancelled:  current.cancelled,
        paid_until: current.paid_until
      }
    });

    res.send(storageBox);
  });
});

server.post('/storagebox/:id', function(req, res, next) {
  if (typeof req.params.storagebox_name !== 'string') {
    return res.send(400, {
      error: {
        status:  400,
        code:    'INVALID_INPUT',
        message: 'Invalid input parameters'
      }
    });
  }

  util.getStorageBoxById(req, res, function(data) {
    data.storagebox.name = req.params.storagebox_name;

    var current    = data.storagebox,
        storageBox = [];

    storageBox.push({
      storagebox: {
        id:         current.id,
        login:      current.login,
        name:       current.name,
        product:    current.product,
        cancelled:  current.cancelled,
        paid_until: current.paid_until
      }
    });

    res.send(storageBox);
  });
});


/**
 * Storagebox snapshot API methods
 */
server.get('/storagebox/:id/snapshot', function(req, res, next) {
  util.getStorageBoxById(req, res, function(data) {
    res.send(data.storagebox.snapshots);
  });
});

server.post('/storagebox/:id/snapshot', function(req, res, next) {
  util.getStorageBoxById(req, res, function(data) {
    var storagebox = data.storagebox;

    storagebox.snapshots.push({
      name:      '',
      timestamp: '',
      size:      Math.floor((Math.random() * 100) + 1) * 100
    });

    return res.send(200, '');
  });
});

server.del('/storagebox/:id/snapshot/:name', function(req, res, next) {
  var storageboxes = clientsDatabase[ req.username ].storageBoxes;

  for (var i = 0; i < storageboxes.length; i++) {

    if (storageboxes[ i ].storagebox.id === parseInt(req.params.id)) {
      var storagebox = storageboxes[ i ].storagebox;

      for (var j = 0; j < storagebox.snapshots.length; j++) {

        if (storagebox.snapshots[ j ].snapshot.name === req.params.name) {
          storagebox.snapshots.splice(j, 1);

          return res.send(200, '');
        }
      }

      return res.send(404, {
        status:  404,
        code:    'SNAPSHOT_NOT_FOUND',
        message: 'Snapshot with name ' + req.params.name + ' not found'
      });
    }
  }

  return res.send(404, {
    status:  404,
    code:    'STORAGEBOX_NOT_FOUND',
    message: 'Storage Box with ID ' + req.params.id + ' not found'
  });
});

server.post('/storagebox/:id/snapshot/:name', function(req, res, next) {
  util.getStorageBoxById(req, res, function(data) {
    var storagebox = data.storagebox;

    if (!req.params.revert) {

      return res.send(400, {
        status:  400,
        code:    'INVALID_INPUT',
        message: 'Invalid input parameters'
      });
    }

    for (var i = 0; i < storagebox.snapshots.length; i++) {


      if (storagebox.snapshots[ i ].snapshot.name === req.params.name) {

        // Voodoo: revert to the snapshot.

        return res.send(200, '');
      }
    }

    return res.send(404, {
      status:  404,
      code:    'SNAPSHOT_NOT_FOUND',
      message: '	Snapshot with name ' + req.params.name + ' not found'
    });
  });
});


/**
 * Reset API methods
 */
server.get('/reset', function(req, res, next) {

});

server.get('/reset/:ipAddress', function(req, res, next) {
});


/**
 * SSH Key API methods
 */
server.get('/key', function(req, res, next) {
  if (clientsDatabase[ req.username ].sshKeys.length === 0) {
    res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'No keys found'
      }
    })
  }

  res.send(clientsDatabase[ req.username ].sshKeys);
});

server.get('/key/:fingerprint', function(req, res, next) {
  // TODO: Validate fingerprint

  util.getSSHKeyByFingerprint(req, res, function(key) {
    res.send(key);
  });
});

server.post('/key/:fingerprint', function(req, res, next) {
  util.getSSHKeyByFingerprint(req, res, function(key) {
    key[ 0 ].key.name = req.params.name;
    res.send(key);
  });
});

server.del('/key/:fingerprint', function(req, res, next) {
  util.getSSHKeyByFingerprint(req, res, function(key) {

    // the key exists, so iterate over the DB again to delete the original,
    // since the getter only returns a copy, not a reference
    var keys = clientsDatabase[ req.username ].sshKeys;

    for (var i = 0; i < keys.length; i++) {
      if (keys[ i ].key.fingerprint === key[ 0 ].key.fingerprint) {
        try {
          keys.splice(i, 1);
        } catch (error) {
          return res.send(500, {
            error: {
              status:  500,
              code:    'KEY_DELETE_FAILED',
              message: 'Deleting the key failed due do an internal error'
            }
          })
        }

        return res.send(200, '');
      }
    }

    return res.send(404, {
      error: {
        status:  404,
        code:    'NOT_FOUND',
        message: 'Key not found'
      }
    })
  });
});

/**
 * VServer methods
 */
server.post('/vserver/:ipAddress/command', function(req, res, next) {
  var vServers = clientsDatabase[ req.username ].vServers;

  for (var i = 0; i < vServers.length; i++) {
    var vServer = vServers[ i ].vserver;

    if (vServer.vserver_ip === req.params.ipAddress) {
      switch (req.params.type) {
        case 'start':
          if (vServer.online) {
            return res.send(500, {
              status:  500,
              code:    'INTERNAL_ERROR',
              message: 'Command failed due to an internal error'
            });
          }

          // "boot" the vServer

          vServer.online = true;

          return res.send(200, '');
          break;
        case 'stop':
          if (!vServer.online) {
            return res.send(500, {
              status:  500,
              code:    'INTERNAL_ERROR',
              message: 'Command failed due to an internal error'
            });
          }

          // "halt" the vServer

          vServer.online = false;

          return res.send(200, '');
          break;
        case 'shutdown':
          if (!vServer.online) {
            return res.send(500, {
              status:  500,
              code:    'INTERNAL_ERROR',
              message: 'Command failed due to an internal error'
            });
          }

          // "shutdown" the vServer

          vServer.online = false;

          return res.send(200, '');
          break;
      }
    }
  }

  return res.send(404, {
    status:  404,
    code:    'SERVER_NOT_FOUND',
    message: 'Server with IP ' + req.params.ipAddress + ' not found'
  });
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

server.on('uncaughtException', function(req, res, route, error) {
  res.send(500, {
    error: {
      status:  500,
      code:    'PSEUDO_API_FAIL',
      message: 'Something went wrong in the pseudo-API server. Please report the issue at: https://github.com/Radiergummi/hetzner-api-client/issues'
    }
  });
});

// listen on port 8080
server.listen(8080);

module.exports = server;
