var crypto        = require('crypto'),
    Draft75Parser = require('./draft75_parser'),
    Draft76Parser = function() { Draft75Parser.apply(this, arguments) };

var bridge = function() {};
bridge.prototype = Draft75Parser.prototype;
Draft76Parser.prototype = new bridge();

var numberFromKey = function(key) {
  return parseInt(key.match(/[0-9]/g).join(''), 10);
};

var spacesInKey = function(key) {
  return key.match(/ /g).length;
};

var bigEndian = function(number) {
  var string = '';
  [24,16,8,0].forEach(function(offset) {
    string += String.fromCharCode(number >> offset & 0xFF);
  });
  return string;
};

Draft76Parser.prototype.getVersion = function() {
  return 'draft-76';
};
  
Draft76Parser.prototype.handshakeResponse = function(head) {
  var request = this._socket.request,
      stream  = this._stream,
      
      key1    = request.headers['sec-websocket-key1'],
      value1  = numberFromKey(key1) / spacesInKey(key1),
      
      key2    = request.headers['sec-websocket-key2'],
      value2  = numberFromKey(key2) / spacesInKey(key2),
      
      MD5     = crypto.createHash('md5');
  
  MD5.update(bigEndian(value1));
  MD5.update(bigEndian(value2));
  MD5.update(head.toString('binary'));
  
  try {
    stream.write( 'HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                  'Upgrade: WebSocket\r\n' +
                  'Connection: Upgrade\r\n' +
                  'Sec-WebSocket-Origin: ' + request.headers.origin + '\r\n' +
                  'Sec-WebSocket-Location: ' + this._socket.url + '\r\n\r\n',
                  'binary');
    
    stream.write(MD5.digest('binary'), 'binary');
  } catch (e) {
    // socket closed while writing
    // no handshake sent; client will stop using WebSocket
  }
};

module.exports = Draft76Parser;

