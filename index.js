'use strict';

/*
 global module,
 require
 */

var colors = require('colors'),
    Client = require('node-rest-client').Client,
    Robot;

/**
 * Creates a new instance of the API client
 *
 * @param {object} config            the configuration object with API connection details
 * @param {string} [config.baseUrl]  the base URL for the Hetzner API, should it change
 * @param {string} config.username   the username for the Hetzner API
 * @param {string} config.password   the password for the Hetzner API
 *
 * @constructor
 */
Robot = function(config) {

  // check if we received a config object
  if (typeof config === 'undefined') {
    throw new Error('Missing configuration data');
  }

  // set the base URL to the API if it has not been overwritten by configuration
  if (!config.hasOwnProperty('baseUrl')) {
    config.baseUrl = 'https://robot-ws.your-server.de/';
  }

  /**
   * the current instance for reference in other scopes
   *
   * @private
   *
   * @type {Robot}
   */
  var _self = this;


  /**
   * The API client which carries out the network communication
   *
   * @private
   *
   * @type {exports.Client}
   */
  var _apiClient = new Client({

    // authentication configuration
    user:     config.username,
    password: config.password,

    // request network configuration
    requestConfig: {
      timeout:        1000,
      noDelay:        true,
      keepAlive:      true,
      keepAliveDelay: 1000
    },

    // response timeout configuration
    responseConfig: {
      timeout: 1000
    }
  });

  /**
   * Contains custom servers and their IP addresses
   *
   * @private
   *
   * @type {{}}
   */
  var _customServers = {};


  /**
   * Contains custom storageBoxes and their IDs
   *
   * @private
   *
   * @type {{}}
   */
  var _customStorageBoxes = {};


  /**
   * try to parse the response object to JSON. If this fails,
   * simply stringify it.
   *
   * @private
   *
   * @param response
   * @param rawData
   * @param resolve
   * @param reject
   *
   * @returns {*}
   */
  var _parseResponse = function(response, rawData, resolve, reject) {

    // check if we have a negative response code
    if (!(rawData.statusCode === 200 || rawData.statusCode === 201)) {
      return reject((response.error.code + ': ' + response.error.message).red);
    }

    try {
      // return indented JSON
      return resolve(JSON.stringify(response, null, 2));
    }

    catch (invalidResponseError) {
      return resolve(response.toString());
    }
  };


  /**
   * Proxies method calls to servers to the API methods while supplementing the IP of a registered
   * Server TODO: Finish the Proxy call even to nested methods
   *
   * @public
   *
   * @param serverName
   * @returns {Object}
   */
  this.server = Object.create(new Proxy({}, {

      /**
       * The first getter allows to proxy property calls to the _customServers object. Basically,
       * this is just for convenience and better syntax: Instead of using a function with a
       * parameter for the server name ("robot.server('myServerName').apiMethod()"), you can simply
       * use "robot.server.myServerName.apiMethod()".
       * The advantage of this additional proxy is that servers don't have to be added to the
       * api client object as properties where they could possibly overwrite its existing properties
       * and pollute the clients namespace (could become fun to call
       * "robot.server.myServer.myServer.myServer...").
       *
       * @param   {object}   target      the proxy call target
       * @param   {string}   serverName  the server name as the called property on the proxy
       * @returns {Object}
       */
      get: function(target, serverName) {
        // whether the given server exists
        if (_customServers.hasOwnProperty(serverName)) {

          /**
           * Create a new Proxy object: That step is needed to intercept method calls to insert our
           * own, additional argument.
           */
          return Object.create(new Proxy({}, {

              /**
               * traps property getter calls. That way, we can check whether the requested method
               * even exists on the parent object and if so, further manipulate the call.
               *
               * @param   {object}   target      the proxy call target
               * @param   {string}   methodName  the method as called on the proxy
               * @returns {Function}
               */
              get: function(target, methodName) {

                // whether the api client object contains the called method
                if (_self.hasOwnProperty(methodName)) {

                  /**
                   * return a new function (to make the function name callable) that adds the
                   * server IP as the first argument to the function call, which essentially
                   * enables calling methods on a single server without having to specify the IP
                   * separately each time.
                   *
                   * I know this is a bit voodoo, but I haven't come up with a better idea yet.
                   * Maybe some prototype inheritance?
                   */
                  return function(/* arguments */) {

                    // "Arrayify" arguments
                    var args = Array.prototype.slice.call(arguments);

                    // push the server IP into the args array (unshift for first arg)
                    args.unshift(_customServers[ serverName ]);

                    // call the API method with itself as context and the args
                    return _self[ methodName ].apply(_self, args);
                  };
                } else {

                  /**
                   * The requested method does not exist, so we throw an exception.
                   */
                  return function() {
                    throw new Error('The method ' + methodName + ' is not implemented. Args: ', arguments);
                  }
                }
              }
            }
          ));
        }
      }
    }
  ));


  /**
   * Allows to register a server to apply API methods onto
   *
   * @public
   *
   * @param   {string} serverName  the server to register
   * @param   {string} ipAddress   the server's IP address
   * @returns {Robot}              the server instance of the API client
   */
  this.registerServer = function(serverName, ipAddress) {
    if (typeof serverName === 'undefined') {
      throw new Error('No server name given.');
    }

    if (_customServers.hasOwnProperty(serverName)) {
      throw new Error('The server ' + serverName + ' is already registered in this instance.');
    }

    _customServers[ serverName ] = ipAddress;

    return this.server[ serverName ];
  };


  /**
   * Allows to unregister a server
   *
   * @public
   *
   * @param {string} serverName  the server to unregister
   */
  this.unregisterServer = function(serverName) {
    if (typeof serverName === 'undefined') {
      throw new Error('No server name given.');
    }

    if (!_customServers.hasOwnProperty(serverName)) {
      throw new Error('The server ' + serverName + ' is not registered in this instance yet.');
    }

    delete _customServers[ serverName ];
  };


  /**
   * query the client servers
   *
   * @public
   * @returns {Promise}  a promise containing the API response when ready
   */
  this.queryServers = function() {
    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'server',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * query a client server
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}  a promise containing the API response when ready
   */
  this.queryServer = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'server/' + ipAddress,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * query all server IPs
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}  a promise containing the API response when ready
   */
  this.queryIps = function(ipAddress) {
    var data = {};

    if (typeof ipAddress !== 'undefined') {
      data.server_ip = ipAddress;
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'ip',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * query a specific server IP
   *
   * @public
   *
   * @param   {string} ipAddress  the IP address of the client server
   * @returns {Promise}           a promise containing the API response when ready
   */
  this.queryIp = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'ip/' + ipAddress,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Query reset status for all client servers
   *
   * @public
   *
   * @param {string} [ipAddress]  an optional IP parameter to query a single server
   * @returns {Promise}
   */
  this.queryReset = function(ipAddress) {
    var url = config.baseUrl + 'reset' + (typeof ipAddress === 'undefined' ? '' : '/' + ipAddress);

    return new Promise((resolve, reject) => {
      _apiClient.get(
        url,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Query WOL status for a client server
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryWol = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'wol/' + ipAddress,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query boot configuration
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query rescue system boot configuration
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryRescueBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/rescue',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Enable the rescue boot system
   *
   * @public
   *
   * @param   {string} ipAddress         the IP address of the client server
   * @param   {string} operatingSystem   the rescue OS to boot (one of linux, linuxold, freebsd,
   *   freebsdbeta, vkvm)
   * @param   {string} [architecture]    optional architecture to use, defaults to 64 Bit
   * @param   {Array}  [keys]            optional key fingerprints to import into SSH configuration
   * @returns {Promise}
   */
  this.enableRescueBoot = function(ipAddress, operatingSystem, architecture, keys) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof operatingSystem === 'undefined') {
      throw new Error('Operating system is missing.');
    }

    architecture = architecture || 64;
    keys = keys || [];


    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'boot/' + ipAddress + '/rescue',
        {
          data: {
            os:             operatingSystem,
            arch:           architecture,
            authorized_key: keys
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Disable the rescue boot system
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.disableRescueBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'boot/' + ipAddress + '/rescue',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Query data for last rescue boot system activation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryLastRescueBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/rescue/last',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query available boot options for linux installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryLinuxBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/linux',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Enable linux installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {object} options                 an object containing installation options
   * @param   {string} options.distribution    the linux distribution to install
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional language to install the system in, defaults
   *   to en (english)
   * @param   {Array}  [options.keys]          optional key fingerprints to import into SSH
   *                                           configuration
   * @returns {Promise}
   */
  this.enableLinuxBoot = function(ipAddress, options) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (!options.hasOwnProperty('distribution')) {
      throw new Error('Installation distribution is missing.');
    }

    var data = {
      dist:           options.distribution,
      arch:           options.architecture || 64,
      lang:           options.language || 'en',
      authorized_key: options.keys || []
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'boot/' + ipAddress + '/linux',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Disable linux installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.disableLinuxBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'boot/' + ipAddress + '/linux',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Query data for last linux installation activation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryLastLinuxBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/linux/last',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query available boot options for vnc installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryVncBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/vnc',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Enable vnc installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {object} options                 an object containing installation options
   * @param   {string} options.distribution    the vnc distribution to install
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional language to install the system in, defaults
   *                                           to en (english)
   * @returns {Promise}
   */
  this.enableVncBoot = function(ipAddress, options) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (!options.hasOwnProperty('distribution')) {
      throw new Error('Installation distribution is missing.');
    }

    var data = {
      dist: options.distribution,
      arch: options.architecture || 64,
      lang: options.language || 'en'
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'boot/' + ipAddress + '/vnc',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Disable vnc installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.disableVncBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'boot/' + ipAddress + '/vnc',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query available boot options for windows installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryWindowsBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/windows',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Enable windows installation
   *
   * @public
   *
   * @param   {string} ipAddress   the IP address of the client server
   * @param   {string} [language]  optional installation language. defaults to en (english)
   * @returns {Promise}
   */
  this.enableWindowsBoot = function(ipAddress, language) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    var data = {
      lang: language || 'en'
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'boot/' + ipAddress + '/windows',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Disable windows installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.disableWindowsBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'boot/' + ipAddress + '/windows',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query available boot options for plesk installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryPleskBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/plesk',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Enable plesk installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {object} options                 options configuration
   * @param   {string} options.distribution    the linux distribution to use as install base
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional installation language. defaults to en
   *   (english)
   * @param   {string} options.hostname        the hostname for the new plesk installation
   * @returns {Promise}
   */
  this.enablePleskBoot = function(ipAddress, options) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (!options.hasOwnProperty('distribution')) {
      throw new Error('Installation distribution is missing.');
    }

    if (!options.hasOwnProperty('hostname')) {
      throw new Error('Installation hostname is missing.');
    }


    var data = {
      dist:     options.distribution,
      lang:     options.language || 'en',
      arch:     options.architecture || 64,
      hostname: options.hostname
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'boot/' + ipAddress + '/plesk',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Disable plesk installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.disablePleskBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'boot/' + ipAddress + '/plesk',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query available boot options for CPanel installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.queryCpanelBootConfig = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'boot/' + ipAddress + '/cpanel',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Enable CPanel installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {object} options                 options configuration
   * @param   {string} options.distribution    the linux distribution to use as install base
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional installation language. defaults to en
   *                                           (english)
   * @param   {string} options.hostname        the hostname for the new plesk installation
   * @returns {Promise}
   */
  this.enableCpanelBoot = function(ipAddress, options) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (!options.hasOwnProperty('distribution')) {
      throw new Error('Installation distribution is missing.');
    }

    if (!options.hasOwnProperty('hostname')) {
      throw new Error('Installation hostname is missing.');
    }


    var data = {
      dist:     options.distribution,
      lang:     options.language || 'en',
      arch:     options.architecture || 64,
      hostname: options.hostname
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'boot/' + ipAddress + '/cpanel',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Disable CPanel installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.disableCpanelBoot = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'boot/' + ipAddress + '/cpanel',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * change a client server's name
   *
   * @public
   *
   * @param   {string}  ipAddress  the IP address of the client server
   * @param   {string}  newName    the new server name
   * @returns {Promise}            a promise containing the API response when ready
   */
  this.setServerName = function(ipAddress, newName) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof newName === 'undefined') {
      throw new Error('New server name is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'server/' + ipAddress,
        {
          data: {
            server_name: newName
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * reset a server
   *
   * @public
   *
   * @param   {string}  ipAddress    the IP address of the client server
   * @param   {string}  [resetType]  the reset type to perform (one of sw, hw or man). defaults to
   *   sw (software reset)
   * @returns {Promise}              a promise containing the API response when ready
   */
  this.resetServer = function(ipAddress, resetType) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    resetType = resetType || 'sw';

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'reset/' + ipAddress,
        {
          data: {
            type: resetType
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * wake a server up
   *
   * @public
   *
   * @param   {string}  ipAddress    the IP address of the client server
   * @returns {Promise}              a promise containing the API response when ready
   */
  this.wakeServer = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'wol/' + ipAddress,
        {
          data: {
            server_ip: ipAddress
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Query reverse DNS entries for either a single or all client servers
   *
   * @public
   *
   * @param {string} [ipAddress]  optional IP address of a specific client server
   * @returns {Promise}
   */
  this.queryReverseDns = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    var url = config.baseUrl + 'rdns' + (typeof ipAddress === 'undefined' ? '' : '/' + ipAddress);

    return new Promise((resolve, reject) => {
      _apiClient.get(
        url,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * set a reverse DNS entry
   *
   * @public
   *
   * @param   {string}  ipAddress      the IP address of the client server
   * @param   {string}  pointerRecord  the DNS name to point to
   * @returns {Promise}                a promise containing the API response when ready
   */
  this.setReverseDns = function(ipAddress, pointerRecord) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof pointerRecord === 'undefined') {
      throw new Error('Pointer record name is missing.');
    }

    var data = {
      ptr: pointerRecord
    };

    return new Promise((resolve, reject) => {
      _apiClient.put(
        config.baseUrl + 'rdns/' + ipAddress,
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * update a reverse DNS entry
   *
   * @public
   *
   * @param   {string}  ipAddress      the IP address of the client server
   * @param   {string}  pointerRecord  the DNS name to point to
   * @returns {Promise}                a promise containing the API response when ready
   */
  this.updateReverseDns = function(ipAddress, pointerRecord) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof pointerRecord === 'undefined') {
      throw new Error('Pointer record name is missing.');
    }

    var data = {
      ptr: pointerRecord
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'rdns/' + ipAddress,
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * remove a reverse DNS entry
   *
   * @public
   *
   * @param   {string}  ipAddress      the IP address of the client server
   * @returns {Promise}                a promise containing the API response when ready
   */
  this.removeReverseDns = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'rdns/' + ipAddress,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * query a client server's cancellation status
   *
   * @public
   *
   * @param   {string}   ipAddress  the IP address of the client server
   * @returns {Promise}             a promise containing the API response when ready
   */
  this.queryCancellationStatus = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'server/' + ipAddress + '/cancellation',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * cancel a client server
   *
   * @public
   *
   * @param   {string} ipAddress             the IP address of the client server
   * @param   {string} cancellationDate      the date to cancel the server at
   * @param   {string} [cancellationReason]  an optional cancellation reason
   * @returns {Promise}                      a promise containing the API response when ready
   */
  this.createCancellation = function(ipAddress, cancellationDate, cancellationReason) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof cancellationDate === 'undefined') {
      throw new Error('Server cancellation date is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'server/' + ipAddress,
        {
          data: {
            cancellation_date:   cancellationDate,
            cancellation_reason: cancellationReason || null
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * cancel a client server cancellation
   *
   * @public
   *
   * @param   {string} ipAddress  the IP address of the client server
   * @returns {Promise}           a promise containing the API response when ready
   */
  this.removeCancellation = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'server/' + ipAddress,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * wrapper method for day statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  this.queryDailyStatistics = function(options) {
    options.type = 'day';

    return this.get(options);
  };

  /**
   * wrapper method for month statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  this.queryMonthlyStatistics = function(options) {
    options.type = 'month';

    return this.get(options);
  };

  /**
   * wrapper method for year statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  this.queryYearlyStatistics = function(options) {
    options.type = 'year';

    return this.get(options);
  };

  /**
   * Query statistics for multiple IP addresses or subnets. One of both must be given.
   *
   * @public
   *
   * @param   {object}       options                statistics options
   * @param   {Array|string} [options.ipAddresses]  either an array of IPs or a single IP string to
   *   query
   * @param   {Array|string} [options.subnets]      either an array of subnets or a single subnet
   *   string to query
   * @param   {string}       [options.rangeFrom]    optional date-time string to start the
   *   statistics at. Will default to today, 0 AM.
   * @param   {string}       [options.rangeTo]      optional date-time string to end the statistics
   *   at. Will default to current hour of today.
   * @param   {string}       [options.type]         the query type
   * @returns {Promise}
   */
  this.queryStatistics = function(options) {
    // TODO: Finish method
    var data = {};

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'traffic',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  /**
   * Change traffic warnings
   *
   * @public
   *
   * @param   {string}  ipAddress                                     the IP address of the client
   *   server
   * @param   {object}  trafficWarningConfiguration                   an object containing the
   *   individual traffic warning configuration keys
   * @param   {boolean} trafficWarningConfiguration.enableWarnings    enable or disable traffic
   *   warnings
   * @param   {number}  trafficWarningConfiguration.hourlyThreshold   hourly traffic limit in MB
   * @param   {number}  trafficWarningConfiguration.dailyThreshold    daily traffic limit in MB
   * @param   {number}  trafficWarningConfiguration.monthlyThreshold  monthly traffic limit in MB
   * @returns {Promise}                                               a promise containing the API
   *   response when ready
   */
  this.changeTrafficWarnings = function(ipAddress, trafficWarningConfiguration) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof trafficWarningConfiguration === 'undefined') {
      throw new Error('Traffic warning configuration is missing.');
    }

    if (!trafficWarningConfiguration.hasOwnProperty('enableWarnings')) {
      throw new Error('Traffic warning enable switch is missing.');
    }

    if (!trafficWarningConfiguration.hasOwnProperty('hourlyThreshold')) {
      throw new Error('Hourly traffic threshold is missing.');
    }

    if (!trafficWarningConfiguration.hasOwnProperty('dailyThreshold')) {
      throw new Error('Daily traffic threshold is missing.');
    }

    if (!trafficWarningConfiguration.hasOwnProperty('monthlyThreshold')) {
      throw new Error('Monthly traffic threshold is missing.');
    }

    var data = {
      traffic_warnings: trafficWarningConfiguration.enableWarnings,
      traffic_hourly:   trafficWarningConfiguration.hourlyThreshold,
      traffic_daily:    trafficWarningConfiguration.dailyThreshold,
      traffic_monthly:  trafficWarningConfiguration.monthlyThreshold
    };


    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'ip/' + ipAddress,
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * retrieves either all SSH keys for this account or a single one if a fingerprint is given.
   *
   * @public
   *
   * @param   {string}  [fingerprint]  an optional unique SSH key fingerprint to query
   * @returns {Promise}                a promise containing the API response when ready
   */
  this.querySSHKeys = function(fingerprint) {
    var url = config.baseUrl + '/key' + (typeof fingerprint === 'undefined' ? '' : '/' + fingerprint);

    return new Promise((resolve, reject) => {
      _apiClient.get(
        url,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * wrapper method for a single SSH key
   *
   * @public
   *
   * @param   {string}  fingerprint  the key's unique fingerprint
   * @returns {Promise}
   */
  this.querySSHKey = function(fingerprint) {
    return this.keys(fingerprint);
  };


  /**
   * adds an SSH key
   *
   * @public
   *
   * @param   {string} keyName  the name for the new key
   * @param   {string} key      the raw key in OpenSSH or SSH2 format
   * @returns {Promise}
   */
  this.addSSHKey = function(keyName, key) {
    if (typeof keyName === 'undefined') {
      throw new Error('SSH Key name is missing.');
    }

    if (typeof key === 'undefined') {
      throw new Error('SSH Key is missing.');
    }

    var data = {
      name: keyName,
      data: key
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'key',
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * removes an SSH key
   *
   * @public
   *
   * @param   {string}  fingerprint  the key's unique fingerprint
   * @returns {Promise}
   */
  this.removeSSHKey = function(fingerprint) {
    if (typeof fingerprint === 'undefined') {
      throw new Error('SSH key fingerprint is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'key/' + fingerprint,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * updates an SSH key's name
   *
   * @public
   *
   * @param   {string}  fingerprint  the key's unique fingerprint
   * @param   {string}  newName
   * @returns {Promise}
   */
  this.updateSSHKeyName = function(fingerprint, newName) {
    if (typeof fingerprint === 'undefined') {
      throw new Error('SSH key fingerprint is missing.');
    }

    if (typeof newName === 'undefined') {
      throw new Error('New SSH key name is missing.');
    }

    var data = {
      name: newName
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'key/' + fingerprint,
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * Proxies method calls for storageBoxes to the API methods while supplementing the ID of a registered
   * StorageBox
   *
   * @public
   *
   * @param storageBoxName
   * @returns {Object}
   */
  this.storageBox = Object.create(new Proxy({}, {

      /**
       * The first getter allows to proxy property calls to the _customStorageBoxes object. Basically,
       * this is just for convenience and better syntax: Instead of using a function with a
       * parameter for the storageBox name ("robot.storageBox('myStorageBoxName').apiMethod()"), you can simply
       * use "robot.storageBox.myStorageBoxName.apiMethod()".
       * The advantage of this additional proxy is that storageBoxes don't have to be added to the
       * api client object as properties where they could possibly overwrite its existing properties
       * and pollute the clients namespace (could become fun to call
       * "robot.storageBox.myBox.myBox.myBox...").
       *
       * @param   {object}   target          the proxy call target
       * @param   {string}   storageBoxName  the storageBox name as the called property on the proxy
       * @returns {Object}
       */
      get: function(target, storageBoxName) {

        // whether the given server exists
        if (_customStorageBoxes.hasOwnProperty(storageBoxName)) {

          /**
           * Create a new Proxy object: That step is needed to intercept method calls to insert our
           * own, additional argument.
           */
          return Object.create(new Proxy({}, {


              /**
               * traps property getter calls. That way, we can check whether the requested method
               * even exists on the parent object and if so, further manipulate the call.
               *
               * @param   {object}   target      the proxy call target
               * @param   {string}   methodName  the method as called on the proxy
               * @returns {Function}
               */
              get: function(target, methodName) {
console.log('getting method')
                // whether the api client object contains the called method
                if (_self.hasOwnProperty(methodName)) {

                  /**
                   * return a new function (to make the function name callable) that adds the
                   * storageBox ID as the first argument to the function call, which essentially
                   * enables calling methods on a single server without having to specify the IP
                   * separately each time.
                   *
                   * I know this is a bit voodoo, but I haven't come up with a better idea yet.
                   * Maybe some prototype inheritance?
                   */
                  return function(/* arguments */) {

                    // "Arrayify" arguments
                    var args = Array.prototype.slice.call(arguments);

                    // push the storageBox ID into the args array (unshift for first arg)
                    args.unshift(_customStorageBoxes[ storageBoxName ]);

                    // call the API method with itself as context and the args
                    return _self[ methodName ].apply(_self, args);
                  };
                } else {

                  /**
                   * The requested method does not exist, so we throw an exception.
                   */
                  return function() {
                    throw new Error('The method ' + methodName + ' is not implemented.');
                  }
                }
              }
            }
          ));
        }
      }
    }
  ));


  /**
   * Allows to register a storageBox to apply API methods onto
   *
   * @public
   *
   * @param   {string} storageBoxName  the storageBox to register
   * @param   {number} id              the storageBox's ID
   * @returns {Robot}                  the storageBox instance of the API client
   */
  this.registerStorageBox = function(storageBoxName, id) {
    if (typeof storageBoxName === 'undefined') {
      throw new Error('No storageBox name given.');
    }

    if (_customStorageBoxes.hasOwnProperty(storageBoxName)) {
      throw new Error('The storageBox ' + storageBoxName + ' is already registered in this instance.');
    }

    _customStorageBoxes[ storageBoxName ] = id;

    return this.storageBox[ storageBoxName ];
  };


  /**
   * Allows to unregister a storageBox
   *
   * @public
   *
   * @param {string} storageBoxName  the storageBox to unregister
   */
  this.unregisterStorageBox = function(storageBoxName) {
    if (typeof storageBoxName === 'undefined') {
      throw new Error('No storageBox name given.');
    }

    if (!_customStorageBoxes.hasOwnProperty(storageBoxName)) {
      throw new Error('The storageBox ' + storageBoxName + ' is not registered in this instance yet.');
    }

    delete _customStorageBoxes[ storageBoxName ];
  };


  /**
   * query either all storageBoxes or a specific one, if an ID is supplemented
   *
   * @param   {number}  [storageBoxId]  the ID number for a specific storageBox
   * @returns {Promise}
   */
  this.queryStorageBoxes = function(storageBoxId) {
    var url = config.baseUrl + 'storagebox' + (typeof storageBoxId === 'undefined' ? '' : '/' + storageBoxId);

    return new Promise((resolve, reject) => {
      _apiClient.get(
        url,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * update the name of a storageBox
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @param   {string}  newName       the new name for the storageBox
   * @returns {Promise}
   */
  this.updateStorageBoxName = function(storageBoxId, newName) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    if (typeof newName === 'undefined') {
      throw new Error('New storageBox name is missing.');
    }

    var data = {
      storagebox_name: newName
    };

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'storagebox/' + storageBoxId,
        {
          data: data
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * query snapshots for a storageBox
   *
   * @public
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @returns {Promise}
   */
  this.queryStorageBoxSnapshots = function(storageBoxId) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.get(
        config.baseUrl + 'storagebox/' + storageBoxId + '/snapshot',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * create a new snapshot of a storageBox
   *
   * @public
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @returns {Promise}
   */
  this.createStorageBoxSnapshot = function(storageBoxId) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'storagebox/' + storageBoxId + '/snapshot',
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  /**
   * remove a storageBox snapshot
   *
   * @public
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @param   {string}  snapshotName  the name of the snapshot to remove
   * @returns {Promise}
   */
  this.removeStorageBoxSnapshot = function(storageBoxId, snapshotName) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    if (typeof snapshotName === 'undefined') {
      throw new Error('Snapshot name is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.delete(
        config.baseUrl + 'storagebox/' + storageBoxId + '/snapshot/' + snapshotName,
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };


  this.startVServer = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'vserver/' + ipAddress + '/command',
        {
          data: {
            type: 'start'
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  this.stopVServer = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'vserver/' + ipAddress + '/command',
        {
          data: {
            type: 'stop'
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };

  this.shutdownVServer = function(ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return new Promise((resolve, reject) => {
      _apiClient.post(
        config.baseUrl + 'vserver/' + ipAddress + '/command',
        {
          data: {
            type: 'shutdown'
          }
        },
        (response, rawData) => _parseResponse(response, rawData, resolve, reject)
      );
    });
  };
};

module.exports = Robot;
