var zlib = require('zlib');

var VALID_PARAMS = [
  'server_no_context_takeover',
  'client_no_context_takeover',
  'server_max_window_bits',
  'client_max_window_bits'
];

var DEFAULT_MAX_WINDOW_BITS = 15,
    VALID_WINDOW_BITS = [8, 9, 10, 11, 12, 13, 14, 15];

var ServerSession = function(driver, params) {
  this._driver = driver;
  this._params = params;
};

ServerSession.validParams = function(params) {
  if (!PermessageDeflate.validParams(params)) return false;

  if (params.hasOwnProperty('server_no_context_takeover')) {
    if (params.server_no_context_takeover !== true) return false;
  }
  if (params.hasOwnProperty('client_no_context_takeover')) {
    if (params.client_no_context_takeover !== true) return false;
  }
  if (params.hasOwnProperty('server_max_window_bits')) {
    if (VALID_WINDOW_BITS.indexOf(params.server_max_window_bits) < 0) return false;
  }
  if (params.hasOwnProperty('client_max_window_bits')) {
    if (params.client_max_window_bits !== true && VALID_WINDOW_BITS.indexOf(params.client_max_window_bits) < 0)
      return false;
  }

  return true;
};

ServerSession.prototype.getResponseParams = function() {
  var params = {};

  // https://tools.ietf.org/html/draft-ietf-hybi-permessage-compression#section-8.1.1.1
  if (this._params.server_no_context_takeover)
    params.server_no_context_takeover = true;

  // https://tools.ietf.org/html/draft-ietf-hybi-permessage-compression#section-8.1.1.2
  if (this._params.client_no_context_takeover)
    params.client_no_context_takeover = true;

  // https://tools.ietf.org/html/draft-ietf-hybi-permessage-compression#section-8.1.2.1
  var serverMax = this._params.server_max_window_bits;
  if (serverMax) {
    params.server_max_window_bits = Math.min(serverMax, DEFAULT_MAX_WINDOW_BITS);
  }

  // https://tools.ietf.org/html/draft-ietf-hybi-permessage-compression#section-8.1.2.2
  var clientMax = this._params.client_max_window_bits;
  if (clientMax) {
    if (clientMax === true) clientMax = DEFAULT_MAX_WINDOW_BITS;
    params.client_max_window_bits = Math.min(clientMax, DEFAULT_MAX_WINDOW_BITS);
  }

  this._agreedParams = params;
  return params;
};

ServerSession.prototype.processIncomingMessage = function(message, callback) {
  var compressed = message.frames[0].rsv1;
  if (!compressed) return callback(message);

  var inflate = this._getInflate(),
      chunks  = [],
      length  = 0;

  var onData = function(chunk) {
    chunks.push(chunk);
    length += chunk.length;
  };

  inflate.on('data', onData);
  inflate.write(message.read());
  inflate.write(new Buffer([0x00, 0x00, 0xff, 0xff]));

  inflate.flush(function() {
    inflate.removeListener('data', onData);
    message.data = PermessageDeflate.concat(chunks, length);
    callback(message);
  });
};

ServerSession.prototype.processOutgoingMessage = function(message, callback) {
  var frame   = message.frames[0],
      deflate = this._getDeflate(),
      chunks  = [],
      length  = 0;

  var onData = function(chunk) {
    chunks.push(chunk);
    length += chunk.length;
  };

  deflate.on('data', onData);
  deflate.write(message.read());

  deflate.flush(function() {
    var payload = PermessageDeflate.concat(chunks, length);
    payload = payload.slice(deflate.headerOffset, payload.length - 4);

    deflate.removeListener('data', onData);
    deflate.headerOffset = 0;

    frame.final   = true;
    frame.rsv1    = true;
    frame.length  = payload.length;
    frame.payload = payload;

    message.frames = [frame];
    callback(message);
  });
};

ServerSession.prototype._getInflate = function() {
  if (this._inflate) return this._inflate;

  var inflate = zlib.createInflate({
    flush:      zlib.Z_SYNC_FLUSH,
    windowBits: this._agreedParams.client_max_window_bits || DEFAULT_MAX_WINDOW_BITS
  });

  var self = this;

  inflate.on('error', function(error) {
    self._driver.fail('extension_error', 'permessage-deflate: ' + error.message);
  });

  if (!this._agreedParams.client_no_context_takeover)
    this._inflate = inflate;

  inflate.write(new Buffer([0x78, 0x9c]));
  return inflate;
};

ServerSession.prototype._getDeflate = function() {
  if (this._deflate) return this._deflate;

  var deflate = zlib.createDeflate({
    flush:      zlib.Z_SYNC_FLUSH,
    windowBits: this._agreedParams.server_max_window_bits || DEFAULT_MAX_WINDOW_BITS
  });

  var self = this;

  deflate.on('error', function(error) {
    self._driver.fail('extension_error', 'permessage-deflate: ' + error.message);
  });

  if (!this._agreedParams.server_no_context_takeover)
    this._deflate = deflate;

  deflate.headerOffset = 2;
  return deflate;
};

var PermessageDeflate = {
  concat: function(buffers, length) {
    var buffer = new Buffer(length),
        offset = 0;

    for (var i = 0, n = buffers.length; i < n; i++) {
      buffers[i].copy(buffer, offset);
      offset += buffers[i].length;
    }
    return buffer;
  },

  createServerSession: function(driver, params) {
    if (!ServerSession.validParams(params)) return null;
    return new ServerSession(driver, params);
  },

  validParams: function(params) {
    var keys = Object.keys(params), i = keys.length;
    while (i--) {
      if (VALID_PARAMS.indexOf(keys[i]) < 0) return false;
      if (params[keys[i]] instanceof Array) return false;
    }
    return true;
  },

  name: 'permessage-deflate',
  rsv1: true,
  rsv2: false,
  rsv3: false
};

module.exports = PermessageDeflate;
