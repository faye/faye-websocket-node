var util   = require('util'),
    net    = require('net'),
    tls    = require('tls'),
    driver = require('websocket-driver'),
    API    = require('./api'),
    Event  = require('./api/event');

var Client = function(url, protocols, options) {
  options = options || {};

  this.url     = url;
  this._uri    = require('url').parse(url);
  this._driver = driver.client(url, {maxLength: options.maxLength, protocols: protocols});

  ['open', 'error'].forEach(function(event) {
    this._driver.on(event, function() {
      self.headers    = self._driver.headers;
      self.statusCode = self._driver.statusCode;
    });
  }, this);

  var secure     = (this._uri.protocol === 'wss:'),
      onConnect  = function() { self._driver.start() },
      tlsOptions = {},
      self       = this;

  if (options.ca) tlsOptions.ca = options.ca;

  var connection = secure
                 ? tls.connect(this._uri.port || 443, this._uri.hostname, tlsOptions, onConnect)
                 : net.createConnection(this._uri.port || 80, this._uri.hostname);

  this._stream = connection;
  this._stream.setTimeout(0);
  this._stream.setNoDelay(true);

  if (!secure) this._stream.on('connect', onConnect);

  API.call(this, options);

  this._stream.on('end', function() { self._finalize('', 1006) });

  this._stream.on('error', function(error) {
    var event = new Event('error', {message: 'Network error: ' + url + ': ' + error.message});
    event.initEvent('error', false, false);
    self.dispatchEvent(event);
    self._finalize('', 1006);
  });
};
util.inherits(Client, API);

module.exports = Client;

