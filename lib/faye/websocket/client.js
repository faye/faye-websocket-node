var util   = require('util'),
    net    = require('net'),
    tls    = require('tls'),
    url    = require('url'),
    driver = require('websocket-driver'),
    API    = require('./api'),
    Event  = require('./api/event');

var DEFAULT_PORTS    = {'http:': 80, 'https:': 443, 'ws:':80, 'wss:': 443},
    SECURE_PROTOCOLS = ['https:', 'wss:'];

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
      port       = endpoint.port || DEFAULT_PORTS[endpoint.protocol],
      secure     = SECURE_PROTOCOLS.indexOf(endpoint.protocol) >= 0,
      onConnect  = function() { self._driver.start() },
      tlsOptions = {},
      self       = this;

  if (options.ca) tlsOptions.ca = options.ca;

  var connection = secure
                 ? tls.connect(port, endpoint.hostname, tlsOptions, onConnect)
                 : net.createConnection(port, endpoint.hostname);

  this._stream = connection;
  if (!secure) this._stream.on('connect', onConnect);

  API.call(this, options);
};
util.inherits(Client, API);

module.exports = Client;
