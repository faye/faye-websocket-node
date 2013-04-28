var Stream   = require('stream'),
    util     = require('util'),
    net      = require('net'),
    tls      = require('tls'),
    protocol = require('../../websocket/protocol'),
    API      = require('./api'),
    Event    = require('./api/event');

var Client = function(url, protocols, options) {
  this.url  = url;
  this._uri = require('url').parse(url);

  this._parser = protocol.client(url, {protocols: protocols});
  var self = this;
  this._parser.onopen   (function(e) { self._open() });
  this._parser.onmessage(function(e) { self._receiveMessage(e.data) });
  this._parser.onclose  (function(e) { self._finalize(e.reason, e.code) });

  this.readyState = API.CONNECTING;
  this.bufferedAmount = 0;

  var secure     = (this._uri.protocol === 'wss:'),
      onConnect  = function() { self._onConnect() },
      tlsOptions = {};

  if (options && options.verify === false) tlsOptions.rejectUnauthorized = false;

  var connection = secure
                 ? tls.connect(this._uri.port || 443, this._uri.hostname, tlsOptions, onConnect)
                 : net.createConnection(this._uri.port || 80, this._uri.hostname);

  this._stream = connection;
  this._stream.setTimeout(0);
  this._stream.setNoDelay(true);

  if (!secure) this._stream.addListener('connect', onConnect);

  this._stream.pipe(this._parser.io);
  this._parser.io.pipe(this._stream);

  this._stream.addListener('close', function() { self._finalize('', 1006) });
};
util.inherits(Client, Stream);

Client.prototype._onConnect = function() {
  this._parser.start();
};

for (var key in API) Client.prototype[key] = API[key];

module.exports = Client;

