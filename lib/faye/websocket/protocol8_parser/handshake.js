var crypto = require('crypto');

var Handshake = function(uri) {
  this._uri = uri;
  
  var buffer = new Buffer(16), i = 16;
  while (i--) buffer[i] = Math.floor(Math.random() * 256);
  this._key = buffer.toString('base64');
  
  var SHA1 = crypto.createHash('sha1');
  SHA1.update(this._key + Handshake.GUID);
  this._accept = SHA1.digest('base64');
  
  var HTTPParser = process.binding('http_parser').HTTPParser,
      parser     = new HTTPParser(HTTPParser.RESPONSE || 'response'),
      current    = null,
      self       = this;
  
  this._nodeVersion = HTTPParser.RESPONSE ? 6 : 4;
  this._complete    = false;
  this._headers     = {};
  this._parser      = parser;
  
  parser.onHeaderField = function(b, start, length) {
    current = b.toString('utf8', start, start + length);
  };
  parser.onHeaderValue = function(b, start, length) {
    self._headers[current] = b.toString('utf8', start, start + length);
  };
  parser.onHeadersComplete = function(info) {
    self._status = info.statusCode;
    var headers = info.headers;
    if (!headers) return;
    for (var i = 0, n = headers.length; i < n; i += 2)
      self._headers[headers[i]] = headers[i+1];
  };
  parser.onMessageComplete = function() {
    self._complete = true;
  };
};

Handshake.GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    
Handshake.prototype.requestData = function() {
  var u = this._uri;
  return new Buffer('GET ' + u.pathname + (u.search || '') + ' HTTP/1.1\r\n' +
                    'Host: ' + u.hostname + (u.port ? ':' + u.port : '') + '\r\n' +
                    'Upgrade: websocket\r\n' +
                    'Connection: Upgrade\r\n' +
                    'Sec-WebSocket-Key: ' + this._key + '\r\n' +
                    'Sec-WebSocket-Version: 8\r\n\r\n',
                    'utf8');
};

Handshake.prototype.parse = function(data) {
  var consumed = this._parser.execute(data, 0, data.length),
      offset   = (this._nodeVersion < 6) ? 1 : 0;
  
  return (consumed === data.length) ? [] : data.slice(consumed + offset);
};

Handshake.prototype.isComplete = function() {
  return this._complete;
};

Handshake.prototype.isValid = function() {
  if (this._status !== 101) return false;
  
  var upgrade    = this._headers.Upgrade,
      connection = this._headers.Connection;
  
  return upgrade && /^websocket$/i.test(upgrade) &&
         connection && connection.split(/\s*,\s*/).indexOf('Upgrade') >= 0 &&
         this._headers['Sec-WebSocket-Accept'] === this._accept;
};

module.exports = Handshake;
