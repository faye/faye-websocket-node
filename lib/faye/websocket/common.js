var bufferConcat = function (buf_a, buf_b) {
  var dst = new Buffer(buf_a.length + buf_b.length);
  buf_a.copy(dst);
  buf_b.copy(dst, buf_a.length);
  return dst;
}

module.exports.bufferConcat = bufferConcat;
