var streams = require('../streams');

var Base = function(request, url, options) {
  this._request   = request;
  this._options   = options || {};
  this.__queue    = [];
  this.readyState = 0;
  this.url        = url;

  var self = this;

  this.io = new streams.IO(this);
  this.messages = new streams.Messages(this);

  this.messages.addListener('data', function(data) {
    self._dispatch('onmessage', new Base.MessageEvent(data));
  });
};

var instance = {
  STATES: ['connecting', 'open', 'closing', 'closed'],

  getState: function() {
    return this.STATES[this.readyState] || null;
  },

  start: function() {
    if (this.readyState !== 0) return false;
    this.io.emit('data', this._handshakeResponse());
    if (this._stage !== -1) this._open();
    return true;
  },

  text: function(message) {
    return this.frame(message);
  },

  binary: function(message) {
    return false;
  },

  ping: function() {
    return false;
  },

  close: function(reason, code) {
    if (this.readyState !== 1) return false;
    this.readyState = 3;
    this._dispatch('onclose', new Base.CloseEvent(null, null));
    return true;
  },

  onopen: function(callback) {
    if (callback) this._onopen = callback;
    return this._onopen;
  },

  onmessage: function(callback) {
    if (callback) this._onmessage = callback;
    return this._onmessage;
  },

  onerror: function(callback) {
    if (callback) this._onerror = callback;
    return this._onerror;
  },

  onclose: function(callback) {
    if (callback) this._onclose = callback;
    return this._onclose;
  },

  _open: function() {
    this.readyState = 1;
    this.__queue.forEach(function(args) { this.frame.apply(this, args) }, this);
    this.__queue = [];
    this._dispatch('onopen', new Base.OpenEvent());
  },

  _dispatch: function(name, event) {
    var messages = this.messages;
    if (name === 'onclose' && messages.readable) {
      messages.readable = messages.writable = false;
      messages.emit('end');
    }
    var handler = this[name]();
    if (handler) handler(event);
  },

  _queue: function(message) {
    this.__queue.push(message);
    return true;
  }
};

for (var key in instance)
  Base.prototype[key] = instance[key];


Base.OpenEvent = function() {};

Base.CloseEvent = function(code, reason) {
  this.code   = code;
  this.reason = reason;
};

Base.MessageEvent = function(data) {
  this.data = data;
};

module.exports = Base;

