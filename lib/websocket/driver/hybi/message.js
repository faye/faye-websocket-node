'use strict';

var Message = function(type) {
  this.type   = type;
  this.frames = [];
  this.length = 0;
};

var instance = {
  read: function() {
    if (this.data) return this.data;

    this.data = new Buffer(this.length);
    var offset = 0;

    for (var i = 0, n = this.frames.length; i < n; i++) {
      this.frames[i].payload.copy(this.data, offset);
      offset += this.frames[i].payload.length;
    }

    return this.data;
  },

  pushFrame: function(frame) {
    delete this.data;
    this.frames.push(frame);
    this.length += frame.payload.length;
  }
};

for (var key in instance)
  Message.prototype[key] = instance[key];

module.exports = Message;
