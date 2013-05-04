// Protocol references:
// 
// * http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-75
// * http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76
// * http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-17

var Draft75 = require('./driver/draft75'),
    Draft76 = require('./driver/draft76'),
    Hybi    = require('./driver/hybi'),
    Client  = require('./driver/client');

var Driver = {
  isSecureConnection: function(request) {
    if (request.headers['x-forwarded-proto']) {
      return request.headers['x-forwarded-proto'] === 'https';
    } else {
      return (request.connection && request.connection.authorized !== undefined) ||
             (request.socket && request.socket.secure);
    }
  },

  determineUrl: function(request) {
    var scheme = this.isSecureConnection(request) ? 'wss:' : 'ws:';
    return scheme + '//' + request.headers.host + request.url;
  },

  client: function(url, options) {
    options = options || {};
    if (options.masking === undefined) options.masking = true;
    return new Client(url, options);
  },

  http: function(request, options) {
    options = options || {};
    if (options.requireMasking === undefined) options.requireMasking = true;

    var headers = request.headers,
        url     = this.determineUrl(request);

    if (headers['sec-websocket-version'])
      return new Hybi(request, url, options);
    else if (headers['sec-websocket-key1'])
      return new Draft76(request, url, options);
    else
      return new Draft75(request, url, options);
  },

  isWebSocket: function(request) {
    var connection = request.headers.connection || '',
        upgrade    = request.headers.upgrade || '';

    return request.method === 'GET' &&
           connection.toLowerCase().split(/\s*,\s*/).indexOf('upgrade') >= 0 &&
           upgrade.toLowerCase() === 'websocket';
  }
};

module.exports = Driver;

