var Base = require('./base'),
    util = require('util');

var Draft75 = function(request, url, options) {
  Base.apply(this, arguments);
  this._stage = 0;
};
util.inherits(Draft75, Base);

var instance = {
  getVersion: function() {
    return 'hixie-75';
  },

  parse: function(buffer) {
    var data, message, value;
    for (var i = 0, n = buffer.length; i < n; i++) {
      data = buffer[i];

      switch (this._stage) {
        case 0:
          this._parseLeadingByte(data);
          break;

        case 1:
          value = (data & 0x7F);
          this._length = value + 128 * this._length;

          if (this._closing && this._length === 0) {
            this._dispatch('onclose', new Base.CloseEvent(null, null));
          }
          else if ((0x80 & data) !== 0x80) {
            if (this._length === 0) {
              this.messages.emit('data', '');
              this._stage = 0;
            }
            else {
              this._buffer = [];
              this._stage = 2;
            }
          }
          break;

        case 2:
          if (data === 0xFF) {
            message = new Buffer(this._buffer).toString('utf8', 0, this._buffer.length);
            this.messages.emit('data', message);
            this._stage = 0;
          }
          else {
            this._buffer.push(data);
            if (this._length && this._buffer.length === this._length)
              this._stage = 0;
          }
          break;
      }
    }
  },

  frame: function(data) {
    if (this.readyState === 0) return this._queue([data]);
    if (this.readyState > 1) return false;

    var buffer = new Buffer(data, 'utf8'),
        frame  = new Buffer(buffer.length + 2);

    frame[0] = 0x00;
    frame[buffer.length + 1] = 0xFF;
    buffer.copy(frame, 1);

    this.io.emit('data', frame);
    return true;
  },

  _handshakeResponse: function() {
    return new Buffer('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                      'Upgrade: WebSocket\r\n' +
                      'Connection: Upgrade\r\n' +
                      'WebSocket-Origin: ' + this._request.headers.origin + '\r\n' +
                      'WebSocket-Location: ' + this.url + '\r\n' +
                      '\r\n',
                      'utf8');
  },

  _parseLeadingByte: function(data) {
    if ((0x80 & data) === 0x80) {
      this._length = 0;
      this._stage = 1;
    } else {
      delete this._length;
      this._buffer = [];
      this._stage = 2;
    }
  }
};

for (var key in instance)
  Draft75.prototype[key] = instance[key];

module.exports = Draft75;

