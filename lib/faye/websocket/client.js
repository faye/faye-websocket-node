var util   = require('util'),
    net    = require('net'),
    tls    = require('tls'),
    url    = require('url'),
    driver = require('websocket-driver'),
    API    = require('./api'),
    Event  = require('./api/event');

var Client = function(_url, protocols, options) {
  options = options || {};

  this.url     = _url;
  this._uri    = url.parse(_url);
  this._proxy  = options.proxy && url.parse(options.proxy);
  this._driver = driver.client(_url, {maxLength: options.maxLength, protocols: protocols, proxy: this._proxy});

  ['open', 'error'].forEach(function(event) {
    this._driver.on(event, function() {
      self.headers    = self._driver.headers;
      self.statusCode = self._driver.statusCode;
    });
  }, this);

  var endpoint   = this._proxy || this._uri,
      secure     = (endpoint.protocol === 'wss:'),
      onConnect  = function() { self._driver.start() },
      tlsOptions = {},
      self       = this;

  if (options.ca) tlsOptions.ca = options.ca;

  var connection = secure
                 ? tls.connect(endpoint.port || 443, endpoint.hostname, tlsOptions, onConnect)
                 : net.createConnection(endpoint.port || 80, endpoint.hostname);

  this._stream = connection;
  if (!secure) this._stream.on('connect', onConnect);

  API.call(this, options);
};
util.inherits(Client, API);

module.exports = Client;
