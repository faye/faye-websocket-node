var util   = require('util'),
    net    = require('net'),
    tls    = require('tls'),
    driver = require('websocket-driver'),
    API    = require('./api'),
    Event  = require('./api/event');

var Client = function(url, protocols, options) {
  this.url     = url;
  this._uri    = require('url').parse(url);
  this._driver = driver.client(url, {protocols: protocols});

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

  if (options && options.ca) tlsOptions.ca = options.ca;

  var connection = secure
                 ? tls.connect(this._uri.port || 443, this._uri.hostname, tlsOptions, onConnect)
                 : net.createConnection(this._uri.port || 80, this._uri.hostname);

  this._stream = connection;
  this._stream.setTimeout(0);
  this._stream.setNoDelay(true);

  if (!secure) this._stream.on('connect', onConnect);

  API.call(this, options);

  this._stream.on('end', function() { self._finalize('', 1006) });
  this._stream.on('error', function(event) {
    var evt = new Event('error', {reason:'Networking error: ' + event.code});
    evt.initEvent('error', false, false);
    self.dispatchEvent(evt);
    self._finalize('', 1006);
  });
};
util.inherits(Client, API);

module.exports = Client;

