var util   = require('util'),
    net    = require('net'),
    tls    = require('tls'),
    driver = require('websocket-driver'),
    API    = require('./api'),
    Event  = require('./api/event');

var Client = function(url, protocols, options) {
  options = options || {};

  var self      = this,
      onConnect = function() { self._driver.start() }

  this.url     = url;
  this._driver = driver.client(url, {maxLength: options.maxLength, protocols: protocols});

  ['open', 'error'].forEach(function(event) {
    this._driver.on(event, function() {
      self.headers    = self._driver.headers;
      self.statusCode = self._driver.statusCode;
    });
  }, this);

  if (options.connection) {
    this._stream = options.connection;
    process.nextTick(onConnect);
  } else {
    var uri        = require('url').parse(url),
        secure     = (uri.protocol === 'wss:'),
        tlsOptions = {}

    if (options.ca) tlsOptions.ca = options.ca;

    if (secure) {
      this._stream = tls.connect(uri.port || 443, uri.hostname, tlsOptions, onConnect)
    } else {
      this._stream = net.createConnection(uri.port || 80, uri.hostname);
      this._stream.on('connect', onConnect);
    }
  }

  API.call(this, options);
};
util.inherits(Client, API);

module.exports = Client;
