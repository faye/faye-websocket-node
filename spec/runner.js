var test   = require('jstest').Test,
    Stream = require('stream').Stream,
    util   = require('util')

var BufferMatcher = function(data) {
  this._data = (typeof data === 'string')
             ? new Buffer(data, 'utf8')
             : new Buffer(data)
}
BufferMatcher.prototype.equals = function(other) {
  if (this._data.length !== other.length) return false;
  for (var i = 0, n = other.length; i < n; i++) {
    if (other[i] !== this._data[i]) return false;
  }
  return true;
}

var Collector = function() {
  this.bytes = []
  this.writable = true
}
util.inherits(Collector, Stream)
Collector.prototype.write = function(buffer) {
  this.bytes = []
  for (var i = 0, n = buffer.length; i < n; i++) {
    this.bytes[i] = buffer[i]
  }
  return true
}

test.Unit.TestCase.include({
  buffer: function(data) {
    return new BufferMatcher(data)
  },
  collector: function() {
    return this._collector = this._collector || new Collector()
  }
})

require('./websocket/driver/draft75_examples')
require('./websocket/driver/draft75_spec')
require('./websocket/driver/draft76_spec')
require('./websocket/driver/hybi_spec')
require('./websocket/driver/client_spec')
