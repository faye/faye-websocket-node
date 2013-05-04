var Stream      = require('stream').Stream,
    util        = require('util'),
    EventTarget = require('./api/event_target'),
    Event       = require('./api/event');

var API = function() {
  this.readable = this.writable = true;

  this.readyState     = API.CONNECTING;
  this.bufferedAmount = 0;
  this.protocol       = '';
  this.url            = this._driver.url;
  this.version        = this._driver.version;

  var self = this;

  this._driver.on('open',    function(e) { self._open() });
  this._driver.on('message', function(e) { self._receiveMessage(e.data) });
  this._driver.on('close',   function(e) { self._finalize(e.reason, e.code) });

  this._driver.on('error', function(error) {
    var event = new Event('error', {message: error.message});
    event.initEvent('error', false, false);
    self.dispatchEvent(event);
  });
  this.on('error', function() {});

  this._driver.messages.on('drain', function() {
    self.emit('drain');
  });

  if (this._ping)
    this._pingTimer = setInterval(function() {
      self._pingId += 1;
      self.ping(self._pingId.toString());
    }, this._ping * 1000);

  this._stream.pipe(this._driver.io);
  this._driver.io.pipe(this._stream);
};
util.inherits(API, Stream);

API.CONNECTING = 0;
API.OPEN       = 1;
API.CLOSING    = 2;
API.CLOSED     = 3;

var instance = {
  write: function(data) {
    if (this.readyState > API.OPEN) return false;
    if (!(data instanceof Buffer)) data = String(data);

    return this._driver.messages.write(data);
  },

  end: function(data) {
    return this._driver.messages.end(data);
  },

  pause: function() {
    return this._driver.messages.pause();
  },

  resume: function() {
    return this._driver.messages.resume();
  },

  send: function(data) {
    return this.write(data);
  },

  ping: function(message, callback) {
    if (this.readyState > API.OPEN) return false;
    return this._driver.ping(message, callback);
  },

  close: function() {
    if (this.readyState === API.OPEN) this.readyState = API.CLOSING;
    this._driver.close();
  },

 _open: function() {
    if (this.readyState !== API.CONNECTING) return;

    this.readyState = API.OPEN;
    this.protocol = this._driver.protocol || '';

    var event = new Event('open');
    event.initEvent('open', false, false);
    this.dispatchEvent(event);
  },

  _receiveMessage: function(data) {
    if (this.readyState !== API.OPEN) return false;

    if (this.readable) this.emit('data', data);

    var event = new Event('message', {data: data});
    event.initEvent('message', false, false);
    this.dispatchEvent(event);
  },

  _finalize: function(reason, code) {
    if (this.readyState === API.CLOSED) return;

    if (this._pingTimer) clearInterval(this._pingTimer);
    if (this._stream) this._stream.end();

    if (this.readable) this.emit('end');
    this.readable = this.writable = false;

    this.readyState = API.CLOSED;
    var event = new Event('close', {code: code || 1000, reason: reason || ''});
    event.initEvent('close', false, false);
    this.dispatchEvent(event);
  }
};

for (var method in instance) API.prototype[method] = instance[method];
for (var key in EventTarget) API.prototype[key] = EventTarget[key];

module.exports = API;

