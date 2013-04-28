var HTTPParser = process.binding('http_parser').HTTPParser,
    url        = require('url'),
    util       = require('util'),
    Base       = require('./base'),
    Hybi       = require('./hybi');

var Client = function(url, options) {
  Hybi.call(this, null, url, options);
  this.client = true;

  this.readyState = -1;
  this._key       = Client.generateKey();
  this._accept    = Hybi.generateAccept(this._key);

  this._http     = new HTTPParser(HTTPParser.RESPONSE || 'response');
  this._node     = HTTPParser.RESPONSE ? 6 : 4;
  this._complete = false;
  this._headers  = {};

  var currentHeader = null,
      self          = this;

  this._http.onHeaderField = function(b, start, length) {
    currentHeader = b.toString('utf8', start, start + length);
  };
  this._http.onHeaderValue = function(b, start, length) {
    self._headers[currentHeader] = b.toString('utf8', start, start + length);
  };
  this._http.onHeadersComplete = function(info) {
    self._status = info.statusCode;
    var headers = info.headers;
    if (!headers) return;
    for (var i = 0, n = headers.length; i < n; i += 2)
      self._headers[headers[i]] = headers[i+1];
  };
  this._http.onMessageComplete = function() {
    self._complete = true;
  };
};
util.inherits(Client, Hybi);

Client.generateKey = function() {
  var buffer = new Buffer(16), i = buffer.length;
  while (i--) buffer[i] = Math.floor(Math.random() * 256);
  return buffer.toString('base64');
};

var instance = {
  start: function() {
    if (this.readyState !== -1) return false;
    this.io.emit('data', this._handshakeRequest());
    this.readyState = 0;
    return true;
  },

  parse: function(data) {
    if (this.readyState > 0) return Hybi.prototype.parse.call(this, data);

    var consumed = this._http.execute(data, 0, data.length),
        offset   = (this._node < 6) ? 1 : 0; 

    if (consumed <= data.length) {
      if (this._isValid()) {
        this._open();
      } else {
        this.readyState = 3;
        this._dispatch('onclose', new Base.CloseEvent(this.ERRORS.protocol_error, ''));
      }
    }
    if (consumed < data.length)
      this.parse(data.slice(consumed + offset));
  },

  _handshakeRequest: function() {
    var uri = url.parse(this.url);

    var headers = [ 'GET ' + (uri.pathname || '/') + (uri.search || '') + ' HTTP/1.1',
                    'Host: ' + uri.hostname + (uri.port ? ':' + uri.port : ''),
                    'Upgrade: websocket',
                    'Connection: Upgrade',
                    'Sec-WebSocket-Key: ' + this._key,
                    'Sec-WebSocket-Version: 13'
                  ];

    if (this._protocols)
      headers.push('Sec-WebSocket-Protocol: ' + this._protocols.join(', '));

    return new Buffer(headers.concat('','').join('\r\n'), 'utf8');
  },

  _isValid: function() {
    if (this._status !== 101) return false;

    var upgrade    = this._headers.Upgrade || '',
        connection = this._headers.Connection || '',
        protocol   = this._headers['Sec-WebSocket-Protocol'];

    this.protocol = this._protocols && this._protocols.indexOf(protocol) >= 0
                  ? protocol
                  : null;

    return upgrade.toLowerCase() === 'websocket' &&
           connection.toLowerCase().split(/\s*,\s*/).indexOf('upgrade') >= 0 &&
           ((!this._protocols && !protocol) || this.protocol) &&
           this._headers['Sec-WebSocket-Accept'] === this._accept;
  }
};

for (var key in instance)
  Client.prototype[key] = instance[key];

module.exports = Client;

