var StreamReader = function() {
  this._queue     = [];
  this._queueSize = 0;
  this._cursor    = 0;
};

StreamReader.prototype.read = function(bytes) {
  return this._readBuffer(bytes);
};

StreamReader.prototype.put = function(buffer) {
  if (!buffer || buffer.length === 0) return;
  if (!buffer.copy) buffer = new Buffer(buffer);
  this._queue.push(buffer);
  this._queueSize += buffer.length;
};

StreamReader.prototype._readBuffer = function(length) {
  if (length > this._queueSize) return null;

  var buffer = new Buffer(length),
      queue  = this._queue,
      remain = length,
      n      = queue.length,
      i      = 0,
      chunk, offset, size;

  if (remain === 0) return buffer;

  while (remain > 0 && i < n) {
    chunk = queue[i];
    offset = (i === 0) ? this._cursor : 0;
    size = Math.min(remain, chunk.length - offset);
    chunk.copy(buffer, length - remain, offset, offset + size);
    remain -= size;
    this._queueSize -= size;
    i += 1;
  }

  queue.splice(0, i-1);
  this._cursor = (i === 1 ? this._cursor : 0) + size;

  // If we've fully read the last chunk we were reading, stop referencing the
  // Buffer now rather than later.
  if (queue.length && this._cursor === queue[0].length) {
    queue.shift();
    this._cursor = 0;
  }

  return buffer;
};

module.exports = StreamReader;
