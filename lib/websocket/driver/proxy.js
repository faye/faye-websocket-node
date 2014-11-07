var Stream     = require('stream').Stream,
    tls        = require('tls'),
    crypto     = require('crypto'),
    url        = require('url'),
    util       = require('util'),
    Headers    = require('./headers'),
    HttpParser = require('../http_parser');

var PORTS = {'ws:': 80, 'wss:': 443};

var Proxy = function(client, origin, options) {
  this._client  = client;
  this._headers = new Headers();
  this._http    = new HttpParser('response');
  this._origin  = (typeof client.url === 'object') ? client.url : url.parse(client.url);
  this._url     = (typeof origin === 'object') ? origin : url.parse(origin);
  this._options = options || {};
  this._state   = 0;

  this.readable = this.writable = true;
  this._paused  = false;
};
util.inherits(Proxy, Stream);

var instance = {
  setHeader: function(name, value) {
    if (this._state !== 0) return false;
    this._headers.set(name, value);
    return true;
  },

  start: function() {
    if (this._state !== 0) return false;
    this._state = 1;

    var proxy  = this._url,
        origin = this._origin,
        port   = origin.port || PORTS[origin.protocol],
        auth   = proxy.auth && new Buffer(proxy.auth, 'utf8').toString('base64');

    var headers = [ 'CONNECT ' + origin.hostname + ':' + port + ' HTTP/1.1',
                    'Host: ' + origin.host,
                    'Connection: keep-alive',
                    'Proxy-Connection: keep-alive'
                  ];

    if (auth)
      headers.push('Proxy-Authorization: Basic ' + auth);

    headers = headers.concat(this._headers.toString(), '');

    this.emit('data', new Buffer(headers.join('\r\n'), 'utf8'));
    return true;
  },

  pause: function() {
    if (this._delegate) return this._delegate.pause();
    this._paused = true;
  },

  resume: function() {
    if (this._delegate) return this._delegate.resume();
    this._paused = false;
    this.emit('drain');
  },

  write: function(chunk) {
    if (this._delegate) return this._delegate.write(chunk);
    if (!this.writable) return false;

    this._http.parse(chunk);
    if (!this._http.isComplete()) return !this._paused;

    this.statusCode = this._http.statusCode;
    this.headers    = this._http.headers;

    if (this.statusCode !== 200) {
      var message = "Can't establish a connection to the server at " + this._origin.href;
      this.emit('error', new Error(message));
      this.end();
      return false;
    }

    if (this._origin.protocol === 'wss:') {
      this._encryptClientIO();
    } else {
      this._configureDelegate(this._client.io);
      this._client.start();
    }

    return !this._paused;
  },

  _encryptClientIO: function() {
    var tlsOpts = this._options.tls || {},
        creds   = crypto.createCredentials(tlsOpts),
        pair    = tls.createSecurePair(creds, false),
        self    = this;

    pair.on('secure', function() {
      if (tlsOpts.rejectUnauthorized === false)
        return self._client.start();

      var verifyError = pair.ssl.verifyError(),
          hostname,
          peerCert;

      if (!verifyError) {
        hostname = self._origin.hostname;
        peerCert = pair.cleartext.getPeerCertificate();

        if (!tls.checkServerIdentity(hostname, peerCert))
          verifyError = new Error("Hostname/IP doesn't match the certificate's altnames");
      }

      if (!verifyError) return self._client.start();

      self.emit('error', verifyError);
      pair.destroy();
    });

    [pair, pair.cleartext, pair.encrypted].forEach(function(emitter) {
      emitter.on('error', function(error) {
        self.emit('error', error);
      });
    });

    this._client.io.pipe(pair.cleartext);
    pair.cleartext.pipe(this._client.io);

    this._configureDelegate(pair.encrypted);
    pair.encrypted.resume();
  },

  _configureDelegate: function(delegate) {
    this._delegate = delegate;
    var self = this;

    ['close', 'data', 'drain', 'end', 'error'].forEach(function(event) {
      self._delegate.on(event, function(data) {
        self.emit(event, data);
      });
    });
  },

  end: function(chunk) {
    if (this._delegate) return this._delegate.end();
    if (!this.writable) return;
    if (chunk !== undefined) this.write(chunk);
    this.readable = this.writable = false;
    this.emit('end');
  },

  destroy: function() {
    if (this._delegate) return this._delegate.destroy();
    this.end();
  }
};

for (var key in instance)
  Proxy.prototype[key] = instance[key];

module.exports = Proxy;
