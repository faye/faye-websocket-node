var util   = require('util'),
    net    = require('net'),
    tls    = require('tls'),
    crypto = require('crypto'),
    url    = require('url'),
    driver = require('websocket-driver'),
    API    = require('./api'),
    Event  = require('./api/event');

var DEFAULT_PORTS    = {'http:': 80, 'https:': 443, 'ws:':80, 'wss:': 443},
    SECURE_PROTOCOLS = ['https:', 'wss:'];

var Client = function(_url, protocols, options) {
  options = options || {};

  this.url     = _url;
  this._driver = driver.client(this.url, {maxLength: options.maxLength, protocols: protocols});

  ['open', 'error'].forEach(function(event) {
    this._driver.on(event, function() {
      self.headers    = self._driver.headers;
      self.statusCode = self._driver.statusCode;
    });
  }, this);

  var proxy     = options.proxy || {},
      endpoint  = url.parse(proxy.origin || this.url),
      port      = endpoint.port || DEFAULT_PORTS[endpoint.protocol],
      secure    = SECURE_PROTOCOLS.indexOf(endpoint.protocol) >= 0,
      onConnect = function() { self._onConnect() },
      originTLS = options.tls || {},
      socketTLS = proxy.origin ? (proxy.tls || {}) : originTLS,
      self      = this;

  originTLS.ca = originTLS.ca || options.ca;

  this._stream = secure
               ? tls.connect(port, endpoint.hostname, socketTLS, onConnect)
               : net.connect(port, endpoint.hostname);

  if (!secure) this._stream.on('connect', onConnect);

  if (proxy.origin) {
    this._proxy = this._driver.proxy(proxy.origin, {tls: originTLS});

    if (proxy.headers) {
      for (var name in proxy.headers) this._proxy.setHeader(name, proxy.headers[name]);
    }

    this._proxy.pipe(this._stream);
    this._stream.pipe(this._proxy);

    this._proxy.on('error', function(error) {
      self._driver.emit('error', error);
    });
  }

  API.call(this, options);
};
util.inherits(Client, API);

Client.prototype._onConnect = function() {
  if (this._proxy)
    this._proxy.start();
  else
    this._driver.start();
};

module.exports = Client;
