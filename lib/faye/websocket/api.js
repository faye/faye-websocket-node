var EventTarget = require('./api/event_target'),
    Event       = require('./api/event');

var API = {
  CONNECTING:   0,
  OPEN:         1,
  CLOSING:      2,
  CLOSED:       3,

  _open: function() {
    if (this.readyState !== API.CONNECTING) return;
    this.readyState = API.OPEN;
    this.protocol = this._parser.protocol || '';
    var event = new Event('open');
    event.initEvent('open', false, false);
    this.dispatchEvent(event);
  },

  _receiveMessage: function(data) {
    if (this.readyState !== API.OPEN) return false;
    this.emit('data', data);
    var event = new Event('message', {data: data});
    event.initEvent('message', false, false);
    this.dispatchEvent(event);
  },

  _finalize: function(reason, code) {
    if (this.readyState === API.CLOSED) return;
    this.readyState = API.CLOSED;
    if (this._pingTimer) clearInterval(this._pingTimer);
    if (this._stream) this._stream.end();
    var event = new Event('close', {code: code || 1000, reason: reason || ''});
    event.initEvent('close', false, false);
    this.dispatchEvent(event);
  },

  write: function(data) {
    if (this.readyState > API.OPEN) return false;
    if (!(data instanceof Buffer)) data = String(data);

    if (data instanceof Buffer)
      return this._parser.binary(data);
    else
      return this._parser.text(data);
  },

  send: function(data) {
    return this.write(data);
  },

  ping: function(message, callback) {
    if (this.readyState > API.OPEN) return false;
    return this._parser.ping(message, callback);
  },

  close: function() {
    if (this.readyState === API.OPEN) this.readyState = API.CLOSING;
    this._parser.close();
  }
};

for (var key in EventTarget) API[key] = EventTarget[key];

module.exports = API;

