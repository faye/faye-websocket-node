var Draft75Parser = function(webSocket) {
  this._socket    = webSocket;
  this._buffer    = [];
  this._buffering = false;
};

var instance = {
  FRAME_START : new Buffer([0x00]),
  FRAME_END   : new Buffer([0xFF]),
  
  getVersion: function() {
    return 'hixie-75';
  },
  
  handshakeResponse: function() {
    return new Buffer('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                      'Upgrade: WebSocket\r\n' +
                      'Connection: Upgrade\r\n' +
                      'WebSocket-Origin: ' + this._socket.request.headers.origin + '\r\n' +
                      'WebSocket-Location: ' + this._socket.url + '\r\n\r\n',
                      'utf8');
  },
  
  parse: function(data) {
    for (var i = 0, n = data.length; i < n; i++) {
      switch (data[i]) {
        case 0x00:
          this._buffering = true;
          break;
        
        case 0xFF:
          this._buffer = new Buffer(this._buffer);
          this._socket.receive(this._buffer.toString('utf8', 0, this._buffer.length));
          this._buffer = [];
          this._buffering = false;
          break;
        
        default:
          if (this._buffering) this._buffer.push(data[i]);
      }
    }
  },
  
  frame: function(data) {
    var buffer = new Buffer(data, 'utf8'),
        frame  = new Buffer(buffer.length + 2);
    
    this.FRAME_START.copy(frame, 0);
    buffer.copy(frame, 1);
    this.FRAME_END.copy(frame, buffer.length + 1);
    
    return frame;
  }
};

for (var key in instance)
  Draft75Parser.prototype[key] = instance[key];

module.exports = Draft75Parser;

