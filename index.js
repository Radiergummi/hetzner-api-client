'use strict';

/*
 global module,
 require
 */

var colors = require('colors'),
    Client = require('node-rest-client').Client;

/**
 * Main Robot API interface, contains all API method wrappers
 */
class Robot {

  /**
   *
   * @param {object}   config                 the configuration object
   * @param {string}   config.username        the API username
   * @param {string}   config.password        the API password
   * @param {string}   [config.baseUrl]       the API URL, should it change
   * @param {string}   [config.responseType]  optional content-type specification, either "json" or "yaml"
   * @param {Function} config.hasOwnProperty  (...just so my IDE won't underline the function)
   *
   * @constructor
   */
  constructor (config) {

    // check if we received a config object
    if (typeof config === 'undefined') {
      throw new Error('Missing configuration data');
    }

    if (!config.hasOwnProperty('username') || config.username.length === 0) {
      throw new Error('Missing API username');
    }

    if (!config.hasOwnProperty('password') || config.password.length === 0) {
      throw new Error('Missing API password');
    }

    // set the base URL to the API if it has not been overwritten by configuration
    if (!config.hasOwnProperty('baseUrl')) {
      config.baseUrl = 'https://robot-ws.your-server.de';
    }

    this.config = config;

    /**
     * The API client which carries out the network communication
     *
     * @private
     *
     * @type {exports.Client}
     */
    this._apiClient = new Client({

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
  }


  /**
   * try to parse the response object to JSON. If this fails,
   * simply stringify it.
   *
   * @private
   *
   * @param   {object}   response    the parsed response object 
   * @param   {number}   statusCode  the response HTTP status code
   * @param   {Function} resolve     the promise resolver
   * @param   {Function} reject      the promise rejector
   *
   * @returns {*}                    the parsed response object or error message string
   */
  _parseResponse (response, statusCode, resolve, reject) {

    // check if we have a negative response code
    if (!(statusCode === 200 || statusCode === 201)) {
      try {
        return reject((response.error.code + ': ' + response.error.message).red);
      }
      
      /**
       * if there appeared an error while rejecting the error, most likely the response
       * lacked the error object or one of its properties, so just return the response
       * itself to avoid trouble
       */
      catch (unexpectedResponseError) {
        return reject(response);
      }
    }
    
    // TODO: Implement JSON/YAML parser here

    // return response
    return resolve(response);
  }


  /**
   * Create a response promise
   *
   * @private
   *
   * @param   {string} method  the request method
   * @param   {string} uri     the API URI to request
   * @param   {object} [data]  an optional data object to submit
   * @returns {Promise}
   */
  _createRequest (method, uri, data) {

    data = data || undefined;
    var contentType = method.toLowerCase()=="post"?"application/x-www-form-urlencoded":"application/json";

    return new Promise((resolve, reject) => {
      this._apiClient[ method ](
        this.config.baseUrl + uri,
        {
          headers: { "Content-Type": contentType },
          data:    data
        },
        (response, rawData) => this._parseResponse(response, rawData.statusCode, resolve, reject)
      ).on('error', (error) => reject(error));
    });
  }


  /**
   * query the client servers
   *
   * @public
   * @returns {Promise}  a promise containing the API response when ready
   */
  queryServers () {
    return this._createRequest('get', '/server');
  }


  /**
   * query a client server
   *
   * @public
   *
   * @param   {string}  ipAddress  the IP address of the client server
   * @returns {Promise}            a promise containing the API response when ready
   */
  queryServer (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (ServerCache.has(ipAddress)) {
      console.log(ServerCache.get(ipAddress));
    }

    return this._createRequest('get', '/server/' + ipAddress);
  }


  /**
   * query all server IPs
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}  a promise containing the API response when ready
   */
  queryIps (ipAddress) {
    var data = {};

    if (typeof ipAddress !== 'undefined') {
      data.server_ip = ipAddress;
    }

    return this._createRequest('get', '/ip', data)
  }


  /**
   * query a specific server IP
   *
   * @public
   *
   * @param   {string} ipAddress  the IP address of the client server
   * @returns {Promise}           a promise containing the API response when ready
   */
  queryIp (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createResponse('get', '/ip/' + ipAddress)
  }


  /**
   * Query reset status for all client servers
   *
   * @public
   *
   * @param {string} [ipAddress]  an optional IP parameter to query a single server
   * @returns {Promise}
   */
  queryReset (ipAddress) {
    var uri = '/reset' + (typeof ipAddress === 'undefined' ? '' : '/' + ipAddress);

    return this._createRequest('get', uri)
  }


  /**
   * Query WOL status for a client server
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryWol (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/wol/' + ipAddress)
  }


  /**
   * Query boot this.config.ration
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress)
  }


  /**
   * Query rescue system boot this.config.ration
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryRescueBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/rescue')
  }


  /**
   * Enable the rescue boot system
   *
   * @public
   *
   * @param   {string} ipAddress         the IP address of the client server
   * @param   {string} operatingSystem   the rescue OS to boot (one of linux, linuxold, freebsd,
   *   freebsdbeta, vkvm)
   * @param   {string} [architecture]    optional architecture to use, defaults to 64 Bit
   * @param   {Array}  [keys]            optional key fingerprints to import into SSH this.config.ration
   * @returns {Promise}
   */
  enableRescueBoot (ipAddress, operatingSystem, architecture, keys) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof operatingSystem === 'undefined') {
      throw new Error('Operating system is missing.');
    }

    architecture = architecture || 64;
    keys = keys || [];

    var data = {
      os:             operatingSystem,
      arch:           architecture,
      authorized_key: keys
    };

    return this._createRequest('post', '/boot/' + ipAddress + '/rescue', data);
  }


  /**
   * Disable the rescue boot system
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  disableRescueBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/boot/' + ipAddress + '/rescue')
  }


  /**
   * Query data for last rescue boot system activation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryLastRescueBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/rescue/last')
  }


  /**
   * Query available boot options for linux installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryLinuxBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/linux')
  }


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
   *                                           this.config.ration
   * @returns {Promise}
   */
  enableLinuxBoot (ipAddress, options) {
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

    return this._createRequest('post', '/boot/' + ipAddress + '/linux', data)
  }


  /**
   * Disable linux installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  disableLinuxBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/boot/' + ipAddress + '/linux')
  }


  /**
   * Query data for last linux installation activation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryLastLinuxBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/linux/last')
  }


  /**
   * Query available boot options for vnc installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryVncBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/vnc')
  }


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
  enableVncBoot (ipAddress, options) {
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

    return this._createRequest('post', '/boot/' + ipAddress + '/vnc', data)
  }


  /**
   * Disable vnc installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  disableVncBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/boot/' + ipAddress + '/vnc')
  }


  /**
   * Query available boot options for windows installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryWindowsBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/windows')
  }


  /**
   * Enable windows installation
   *
   * @public
   *
   * @param   {string} ipAddress   the IP address of the client server
   * @param   {string} [language]  optional installation language. defaults to en (english)
   * @returns {Promise}
   */
  enableWindowsBoot (ipAddress, language) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    var data = {
      lang: language || 'en'
    };

    return this._createRequest('post', '/boot/' + ipAddress + '/windows', data)
  }


  /**
   * Disable windows installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  disableWindowsBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/boot/' + ipAddress + '/windows')
  }


  /**
   * Query available boot options for plesk installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryPleskBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/plesk')
  }


  /**
   * Enable plesk installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {Object} options                 options this.config.ration
   * @param   {string} options.distribution    the linux distribution to use as install base
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional installation language. defaults to en (english)
   * @param   {Function} options.hasOwnProperty  ...just so my IDE won't complain about it being missing
   * @param   {string} options.hostname        the hostname for the new plesk installation
   * @returns {Promise}
   */
  enablePleskBoot (ipAddress, options) {
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

    return this._createRequest('post', '/boot/' + ipAddress + '/plesk', data)
  }


  /**
   * Disable plesk installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  disablePleskBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/boot/' + ipAddress + '/plesk')
  }


  /**
   * Query available boot options for CPanel installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  queryCpanelBootConfig (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/boot/' + ipAddress + '/cpanel')
  }


  /**
   * Enable CPanel installation
   *
   * @public
   *
   * @param   {string} ipAddress               the IP address of the client server
   * @param   {object} options                 options this.config.ration
   * @param   {string} options.distribution    the linux distribution to use as install base
   * @param   {number} [options.architecture]  optional architecture to use, defaults to 64 Bit
   * @param   {string} [options.language]      optional installation language. defaults to en
   *                                           (english)
   * @param   {string} options.hostname        the hostname for the new plesk installation
   * @returns {Promise}
   */
  enableCpanelBoot (ipAddress, options) {
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

    return this._createRequest('post', '/boot/' + ipAddress + '/cpanel', data)
  }


  /**
   * Disable CPanel installation
   *
   * @public
   *
   * @param {string} ipAddress  the IP address of the client server
   * @returns {Promise}
   */
  disableCpanelBoot (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/boot/' + ipAddress + '/cpanel')
  }


  /**
   * change a client server's name
   *
   * @public
   *
   * @param   {string}  ipAddress  the IP address of the client server
   * @param   {string}  newName    the new server name
   * @returns {Promise}            a promise containing the API response when ready
   */
  updateServerName (ipAddress, newName) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof newName === 'undefined') {
      throw new Error('New server name is missing.');
    }

    var data = {
      server_name: newName
    };

    return this._createRequest('post', '/server/' + ipAddress, data);
  }


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
  resetServer (ipAddress, resetType) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    resetType = resetType || 'sw';

    var data = {
      type: resetType
    };

    return this._createRequest('post', '/reset/' + ipAddress, data);
  }


  /**
   * wake a server up
   *
   * @public
   *
   * @param   {string}  ipAddress    the IP address of the client server
   * @returns {Promise}              a promise containing the API response when ready
   */
  wakeServer (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    var data = {
      server_ip: ipAddress
    };

    return this._createRequest('post', '/wol/' + ipAddress, data);
  }


  /**
   * Query reverse DNS entries for either a single or all client servers
   *
   * @public
   *
   * @param {string} [ipAddress]  optional IP address of a specific client server
   * @returns {Promise}
   */
  queryReverseDns (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    var uri = '/rdns' + (typeof ipAddress === 'undefined' ? '' : '/' + ipAddress);

    return this._createRequest('get', uri)
  }


  /**
   * set a reverse DNS entry
   *
   * @public
   *
   * @param   {string}  ipAddress      the IP address of the client server
   * @param   {string}  pointerRecord  the DNS name to point to
   * @returns {Promise}                a promise containing the API response when ready
   */
  setReverseDns (ipAddress, pointerRecord) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof pointerRecord === 'undefined') {
      throw new Error('Pointer record name is missing.');
    }

    var data = {
      ptr: pointerRecord
    };

    return this._createRequest('put', '/rdns/' + ipAddress, data)
  }


  /**
   * update a reverse DNS entry
   *
   * @public
   *
   * @param   {string}  ipAddress      the IP address of the client server
   * @param   {string}  pointerRecord  the DNS name to point to
   * @returns {Promise}                a promise containing the API response when ready
   */
  updateReverseDns (ipAddress, pointerRecord) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof pointerRecord === 'undefined') {
      throw new Error('Pointer record name is missing.');
    }

    var data = {
      ptr: pointerRecord
    };

    return this._createRequest('post', '/rdns/' + ipAddress, data)
  }


  /**
   * remove a reverse DNS entry
   *
   * @public
   *
   * @param   {string}  ipAddress      the IP address of the client server
   * @returns {Promise}                a promise containing the API response when ready
   */
  removeReverseDns (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/rdns/' + ipAddress)
  }


  /**
   * query a client server's cancellation status
   *
   * @public
   *
   * @param   {string}   ipAddress  the IP address of the client server
   * @returns {Promise}             a promise containing the API response when ready
   */
  queryCancellationStatus (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('get', '/server/' + ipAddress + '/cancellation');
  }


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
  createCancellation (ipAddress, cancellationDate, cancellationReason) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof cancellationDate === 'undefined') {
      throw new Error('Server cancellation date is missing.');
    }

    var data = {
      cancellation_date:   cancellationDate,
      cancellation_reason: cancellationReason || null
    };

    return this._createRequest('post', '/server/' + ipAddress + '/cancellation', data);
  }


  /**
   * cancel a client server cancellation
   *
   * @public
   *
   * @param   {string} ipAddress  the IP address of the client server
   * @returns {Promise}           a promise containing the API response when ready
   */
  removeCancellation (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('delete', '/server/' + ipAddress + '/cancellation');
  }


  /**
   * wrapper method for day statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  queryDailyStatistics (options) {
    options.type = 'day';

    return queryStatistics(options);
  }


  /**
   * wrapper method for month statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  queryMonthlyStatistics (options) {
    options.type = 'month';

    return queryStatistics(options);
  }


  /**
   * wrapper method for year statistics
   *
   * @public
   *
   * @param options
   * @returns {Promise}
   */
  queryYearlyStatistics (options) {
    options.type = 'year';

    return queryStatistics(options);
  }


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
  queryStatistics (options) {
    // TODO: Finish method
    var data = {};

    return this._createRequest('post', '/traffic', data)
  }


  /**
   * Change traffic warnings
   *
   * @public
   *
   * @param   {string}  ipAddress                              the IP address of the client server
   * @param   {object}  trafficWarningConfig                   an object containing the individual traffic warning
   *                                                           config keys
   * @param   {boolean} trafficWarningConfig.enableWarnings    enable or disable traffic warnings
   * @param   {number}  trafficWarningConfig.hourlyThreshold   hourly traffic limit in MB
   * @param   {number}  trafficWarningConfig.dailyThreshold    daily traffic limit in MB
   * @param   {number}  trafficWarningConfig.monthlyThreshold  monthly traffic limit in MB
   * @returns {Promise}                                        a promise containing the API response when ready
   */
  changeTrafficWarnings (ipAddress, trafficWarningConfig) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    if (typeof trafficWarningConfig.ration === 'undefined') {
      throw new Error('Traffic warning this.config.ration is missing.');
    }

    if (!trafficWarningConfig.hasOwnProperty('enableWarnings')) {
      throw new Error('Traffic warning enable switch is missing.');
    }

    if (!trafficWarningConfig.hasOwnProperty('hourlyThreshold')) {
      throw new Error('Hourly traffic threshold is missing.');
    }

    if (!trafficWarningConfig.hasOwnProperty('dailyThreshold')) {
      throw new Error('Daily traffic threshold is missing.');
    }

    if (!trafficWarningConfig.hasOwnProperty('monthlyThreshold')) {
      throw new Error('Monthly traffic threshold is missing.');
    }

    var data = {
      traffic_warnings: trafficWarningConfig.enableWarnings,
      traffic_hourly:   trafficWarningConfig.hourlyThreshold,
      traffic_daily:    trafficWarningConfig.dailyThreshold,
      traffic_monthly:  trafficWarningConfig.monthlyThreshold
    };


    return this._createRequest('post', '/ip/' + ipAddress, data)
  }


  /**
   * retrieves either all SSH keys for account or a single one if a fingerprint is given.
   *
   * @public
   *
   * @param   {string}  [fingerprint]  an optional unique SSH key fingerprint to query
   * @returns {Promise}                a promise containing the API response when ready
   */
  querySSHKeys (fingerprint) {
    var uri = '/key' + (typeof fingerprint === 'undefined' ? '' : '/' + fingerprint);

    return this._createRequest('get', uri)
  }


  /**
   * wrapper method for a single SSH key
   *
   * @public
   *
   * @param   {string}  fingerprint  the key's unique fingerprint
   * @returns {Promise}
   */
  querySSHKey (fingerprint) {
    return this.querySSHKeys(fingerprint);
  }


  /**
   * adds an SSH key
   *
   * @public
   *
   * @param   {string} keyName  the name for the new key
   * @param   {string} key      the raw key in OpenSSH or SSH2 format
   * @returns {Promise}
   */
  addSSHKey (keyName, key) {
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

    return this._createRequest('post', '/key', data)
  }


  /**
   * removes an SSH key
   *
   * @public
   *
   * @param   {string}  fingerprint  the key's unique fingerprint
   * @returns {Promise}
   */
  removeSSHKey (fingerprint) {
    if (typeof fingerprint === 'undefined') {
      throw new Error('SSH key fingerprint is missing.');
    }

    return this._createRequest('delete', '/key/' + fingerprint)
  }


  /**
   * updates an SSH key's name
   *
   * @public
   *
   * @param   {string}  fingerprint  the key's unique fingerprint
   * @param   {string}  newName
   * @returns {Promise}
   */
  updateSSHKeyName (fingerprint, newName) {
    if (typeof fingerprint === 'undefined') {
      throw new Error('SSH key fingerprint is missing.');
    }

    if (typeof newName === 'undefined') {
      throw new Error('New SSH key name is missing.');
    }

    var data = {
      name: newName
    };

    return this._createRequest('post', '/key/' + fingerprint, data)
  }


  /**
   * query either all storageBoxes or a specific one, if an ID is supplemented
   *
   * @param   {number}  [storageBoxId]  the ID number for a specific storageBox
   * @returns {Promise}
   */
  queryStorageBoxes (storageBoxId) {
    var uri = '/storagebox' + (typeof storageBoxId === 'undefined' ? '' : '/' + storageBoxId);

    return this._createRequest('get', uri);
  }


  /**
   * wrapper to queryStorageBoxes
   *
   * @param storageBoxId
   * @returns {Promise}
   */
  queryStorageBox (storageBoxId) {
    return this.queryStorageBoxes(storageBoxId);
  }


  /**
   * update the name of a storageBox
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @param   {string}  newName       the new name for the storageBox
   * @returns {Promise}
   */
  updateStorageBoxName (storageBoxId, newName) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    if (typeof newName === 'undefined') {
      throw new Error('New storageBox name is missing.');
    }

    var data = {
      storagebox_name: newName
    };

    return this._createRequest('post', '/storagebox/' + storageBoxId, data);
  }


  /**
   * query snapshots for a storageBox
   *
   * @public
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @returns {Promise}
   */
  queryStorageBoxSnapshots (storageBoxId) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    return this._createRequest('get', '/storagebox/' + storageBoxId + '/snapshot')
  }


  /**
   * create a new snapshot of a storageBox
   *
   * @public
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @returns {Promise}
   */
  createStorageBoxSnapshot (storageBoxId) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    return this._createRequest('post', '/storagebox/' + storageBoxId + '/snapshot')
  }


  /**
   * remove a storageBox snapshot
   *
   * @public
   *
   * @param   {number}  storageBoxId  the ID number for a specific storageBox
   * @param   {string}  snapshotName  the name of the snapshot to remove
   * @returns {Promise}
   */
  removeStorageBoxSnapshot (storageBoxId, snapshotName) {
    if (typeof storageBoxId === 'undefined') {
      throw new Error('StorageBox ID is missing.');
    }

    if (typeof snapshotName === 'undefined') {
      throw new Error('Snapshot name is missing.');
    }

    return this._createRequest('delete', '/storagebox/' + storageBoxId + '/snapshot/' + snapshotName)
  }


  startVServer (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('post', '/vserver/' + ipAddress + '/command', {
      type: 'start'
    });
  }


  stopVServer (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('post', '/vserver/' + ipAddress + '/command', {
      type: 'stop'
    });
  }


  shutdownVServer (ipAddress) {
    if (typeof ipAddress === 'undefined') {
      throw new Error('Server IP is missing.');
    }

    return this._createRequest('post', '/vserver/' + ipAddress + '/command', {
      type: 'shutdown'
    });
  }
}

/**
 * Cache for all currently identified server instances
 *
 * @private
 * @type {WeakMap}
 *
 * @const
 */
const ServerCache = new WeakMap();

/**
 * Registers a storageBox as an identified instance
 *
 * @public
 *
 * @param   {string} ipAddress  the IP address of the server to register
 * @returns {*}
 */
Robot.prototype.registerServer = function(ipAddress) {
  if (typeof ipAddress === 'undefined' || ipAddress.length < 7) {
    throw new Error('Missing IP address');
  }

  if (!ServerCache.has(this))
    ServerCache.set(this, new Map());
  const thisCache = ServerCache.get(this);
  if (!thisCache.get(ipAddress))
    thisCache.set(ipAddress, new IdentifiedServer(this, ipAddress));
  return thisCache.get(ipAddress);
};

/**
 *
 */
class IdentifiedServer {

  /**
   * Creates new identified server instances
   *
   * @param {Robot}  identifiedServerInstance  the Robot instance
   * @param {string} ipAddress                 the IP address of the server to register
   *
   * @constructor
   */
  constructor (identifiedServerInstance, ipAddress) {
    this.identifiedServerInstance = identifiedServerInstance;
    this.ipAddress = ipAddress;
  }
}

Object.getOwnPropertyNames(Robot.prototype).forEach(function(method) {
  if (typeof Robot.prototype[ method ] != "function") {
    return;
  }

  switch (method) {
    case 'registerServer':
    case 'registerStorageBox':
      return;
      break;

    default:
      IdentifiedServer.prototype[ method ] = function(...args) {
        return this.identifiedServerInstance[ method ](this.ipAddress, ...args);
      };
  }
});

/**
 * Cache for all currently identified storageBox instances
 *
 * @private
 * @type {WeakMap}
 *
 * @const
 */
const StorageBoxCache = new WeakMap();

/**
 * Registers a storageBox as an identified instance
 *
 * @public
 *
 * @param   {number} id  the ID of the storageBox to register
 * @returns {*}
 */
Robot.prototype.registerStorageBox = function(id) {
  if (typeof id === 'undefined' || id.length === 0) {
    throw new Error('Missing storageBox ID');
  }

  if (!StorageBoxCache.has(this))
    StorageBoxCache.set(this, new Map());
  const thisCache = StorageBoxCache.get(this);
  if (!thisCache.get(id))
    thisCache.set(id, new IdentifiedStorageBox(this, id));
  return thisCache.get(id);
};

/**
 *
 */
class IdentifiedStorageBox {

  /**
   * Creates new identified storageBox instances
   *
   * @param IdentifiedStorageBoxInstance
   * @param id
   *
   * @constructor
   */
  constructor (IdentifiedStorageBoxInstance, id) {
    this.IdentifiedStorageBoxInstance = IdentifiedStorageBoxInstance;
    this.id = id;
  }
}

Object.getOwnPropertyNames(Robot.prototype).forEach(function(method) {
  if (typeof Robot.prototype[ method ] != "function") {
    return;
  }

  switch (method) {
    case 'registerServer':
    case 'registerStorageBox':
      return;
      break;

    default:
      IdentifiedStorageBox.prototype[ method ] = function(...args) {
        return this.IdentifiedStorageBoxInstance[ method ](this.id, ...args);
      };
  }
});


module.exports = Robot;
