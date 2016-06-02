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
 * @param {object} config           the configuration object with API connection details
 * @param {string} config.baseUrl   the base URL for the Hetzner API, should it change
 * @param {string} config.username  the username for the Hetzner API
 * @param {string} config.password  the password for the Hetzner API
 *
 * @constructor
 */
Robot = function(config) {

  // check if we received a config object
  if (typeof config === 'undefined') {
    throw new Error('Missing configuration data');
  }

  /**
   * The API client which carries out the network communication
   *
   * @type {exports.Client}
   * @private
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
   *
   *
   * @param {string} ipAddress
   */
  this.use = function(ipAddress) {
    // TODO: Implement proxy?
  };


  /**
   * Object to group information related API methods
   *
   * @public
   *
   * @type {{}}
   */
  this.info = {};


  /**
   * query the client servers
   *
   * @public
   * @returns {Promise}  a promise containing the API response when ready
   */
  this.info.servers = function() {
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
  this.info.server = function(ipAddress) {
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
  this.info.ips = function(ipAddress) {
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
  this.info.ip = function(ipAddress) {
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
  this.info.reset = function(ipAddress) {
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
  this.info.wol = function(ipAddress) {
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
   * Boot methods
   * @public
   */
  this.boot = {};

  /**
   * Query boot configuration
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.config = function(ipAddress) {
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
   * rescue system methods
   * @public
   *
   * @type {{}}
   */
  this.boot.rescue = {};

  /**
   * Query rescue system boot configuration
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.rescue.config = function(ipAddress) {
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
   * @param   {string} operatingSystem   the rescue OS to boot (one of linux, linuxold, freebsd, freebsdbeta, vkvm)
   * @param   {string} [architecture]    optional architecture to use, defaults to 64 Bit
   * @param   {Array}  [keys]            optional key fingerprints to import into SSH configuration
   * @returns {Promise}
   */
  this.boot.rescue.enable = function(ipAddress, operatingSystem, architecture, keys) {
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
  this.boot.rescue.disable = function(ipAddress) {
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
  this.boot.rescue.last = function(ipAddress) {
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
   * linux installation methods
   * @public
   *
   * @type {{}}
   */
  this.boot.linux = {};

  /**
   * Query available boot options for linux installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.linux.config = function(ipAddress) {
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
   * @param   {string} [options.language]      optional language to install the system in, defaults to en (english)
   * @param   {Array}  [options.keys]          optional key fingerprints to import into SSH
   *                                           configuration
   * @returns {Promise}
   */
  this.boot.linux.enable = function(ipAddress, options) {
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
  this.boot.linux.disable = function(ipAddress) {
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
  this.boot.linux.last = function(ipAddress) {
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
   * vnc installation methods
   * @public
   *
   * @type {{}}
   */
  this.boot.vnc = {};

  /**
   * Query available boot options for vnc installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.vnc.config = function(ipAddress) {
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
  this.boot.vnc.enable = function(ipAddress, options) {
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
  this.boot.vnc.disable = function(ipAddress) {
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
   * Windows installation methods
   * @public
   *
   * @type {{}}
   */
  this.boot.windows = {};

  /**
   * Query available boot options for windows installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.windows.config = function(ipAddress) {
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
  this.boot.windows.enable = function(ipAddress, language) {
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
  this.boot.windows.disable = function(ipAddress) {
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
   * Plesk installation methods
   *
   * @public
   *
   * @type {{}}
   */
  this.boot.plesk = {};

  /**
   * Query available boot options for plesk installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.plesk.config = function(ipAddress) {
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
   * @param   {string} [options.language]      optional installation language. defaults to en (english)
   * @param   {string} options.hostname        the hostname for the new plesk installation
   * @returns {Promise}
   */
  this.boot.plesk.enable = function(ipAddress, options) {
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
  this.boot.plesk.disable = function(ipAddress) {
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
   * CPanel installation methods
   *
   * @public
   *
   * @type {{}}
   */
  this.boot.cpanel = {};

  /**
   * Query available boot options for CPanel installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  this.boot.cpanel.config = function(ipAddress) {
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
   * Enable CP installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {object} options                 options configuration
   * @param   {string} options.distribution    the linux distribution to use as install base
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional installation language. defaults to en (english)
   * @param   {string} options.hostname        the hostname for the new plesk installation
   * @returns {Promise}
   */
  this.boot.cpanel.enable = function(ipAddress, options) {
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
  this.boot.cpanel.disable = function(ipAddress) {
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
   * Server methods
   * @public
   *
   * @type {{}}
   */
  this.server = {};

  /**
   * change a client server's name
   *
   * @public
   *
   * @param   {string}  ipAddress  the IP address of the client server
   * @param   {string}  newName    the new server name
   * @returns {Promise}            a promise containing the API response when ready
   */
  this.server.setName = function(ipAddress, newName) {
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
   * @param   {string}  [resetType]  the reset type to perform (one of sw, hw or man). defaults to sw (software reset)
   * @returns {Promise}              a promise containing the API response when ready
   */
  this.server.reset = function(ipAddress, resetType) {
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
  this.server.wol = function(ipAddress) {
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
   * Reverse DNS methods
   * @public
   *
   * @type {{}}
   */
  this.reverseDns = {};

  /**
   * Query reverse DNS entries for either a single or all client servers
   *
   * @public
   *
   * @param {string} [ipAddress]  optional IP address of a specific client server
   * @returns {Promise}
   */
  this.reverseDns.get = function(ipAddress) {
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
  this.reverseDns.set = function(ipAddress, pointerRecord) {
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
  this.reverseDns.update = function(ipAddress, pointerRecord) {
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
  this.reverseDns.remove = function(ipAddress) {
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
   * Cancellation methods
   * @public
   *
   * @type {{}}
   */
  this.cancellation = {};

  /**
   * query a client server's cancellation status
   *
   * @public
   *
   * @param   {string}   ipAddress  the IP address of the client server
   * @returns {Promise}             a promise containing the API response when ready
   */
  this.cancellation.status = function(ipAddress) {
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
  this.cancellation.create = function(ipAddress, cancellationDate, cancellationReason) {
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
  this.cancellation.cancel = function(ipAddress) {
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
   * Traffic methods
   * @public
   *
   * @type {{}}
   */
  this.traffic = {
    statistics: {}
  };

  /**
   * wrapper method for day statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  this.traffic.statistics.day = function(options) {
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
  this.traffic.statistics.month = function(options) {
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
  this.traffic.statistics.year = function(options) {
    options.type = 'year';

    return this.get(options);
  };

  /**
   * Query statistics for multiple IP addresses or subnets. One of both must be given.
   *
   * @public
   *
   * @param   {object}       options                statistics options
   * @param   {Array|string} [options.ipAddresses]  either an array of IPs or a single IP string to query
   * @param   {Array|string} [options.subnets]      either an array of subnets or a single subnet string to query
   * @param   {string}       [options.rangeFrom]    optional date-time string to start the statistics at. Will default
   *                                                to today, 0 AM.
   * @param   {string}       [options.rangeTo]      optional date-time string to end the statistics at. Will default to
   *                                                current hour of today.
   * @param   {string}       [options.type]         the query type
   * @returns {Promise}
   */
  this.traffic.statistics.get = function(options) {
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
   * @param   {string}  ipAddress                                     the IP address of the client server
   * @param   {object}  trafficWarningConfiguration                   an object containing the individual traffic
   *                                                                  warning configuration keys
   * @param   {boolean} trafficWarningConfiguration.enableWarnings    enable or disable traffic warnings
   * @param   {number}  trafficWarningConfiguration.hourlyThreshold   hourly traffic limit in MB
   * @param   {number}  trafficWarningConfiguration.dailyThreshold    daily traffic limit in MB
   * @param   {number}  trafficWarningConfiguration.monthlyThreshold  monthly traffic limit in MB
   * @returns {Promise}                                               a promise containing the API response when ready
   */
  this.traffic.changeWarnings = function(ipAddress, trafficWarningConfiguration) {
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
   * SSH methods
   *
   * @public
   *
   * @type {{}}
   */
  this.ssh = {};


  /**
   * retrieves either all SSH keys for this account or a single one if a fingerprint is given.
   *
   * @public
   *
   * @param   {string}  [fingerprint]  an optional specific SSH key fingerprint to query
   * @returns {Promise}                a promise containing the API response when ready
   */
  this.ssh.keys = function(fingerprint) {
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
   * @param {string} fingerprint
   * @returns {Promise}
   */
  this.ssh.key = function(fingerprint) {
    return this.keys(fingerprint);
  }
};

module.exports = Robot;
