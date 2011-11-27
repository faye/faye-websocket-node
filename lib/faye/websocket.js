// API and protocol references:
// 
// * http://dev.w3.org/html5/websockets/
// * http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-eventtarget
// * http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-event
// * http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-75
// * http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76
// * http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-17

var Draft75Parser   = require('./websocket/draft75_parser'),
    Draft76Parser   = require('./websocket/draft76_parser'),
    Protocol8Parser = require('./websocket/protocol8_parser'),
    API             = require('./websocket/api');

var getParser = function(request) {
  var headers = request.headers;
  return headers['sec-websocket-version']
       ? Protocol8Parser
       : (headers['sec-websocket-key1'] && headers['sec-websocket-key2'])
       ? Draft76Parser
       : Draft75Parser;
};

var isSecureConnection = function(request) {
  if (request.headers['x-forwarded-proto']) {
    return request.headers['x-forwarded-proto'] === 'https';
  } else {
    return (request.connection && request.connection.authorized !== undefined) ||
           (request.socket && request.socket.secure);
  }
};

var WebSocket = function(request, socket, head) {
  this.request = request;
  this._stream = request.socket;
  
  var scheme = isSecureConnection(request) ? 'wss:' : 'ws:';
  this.url = scheme + '//' + request.headers.host + request.url;    
  this.readyState = API.CONNECTING;
  this.bufferedAmount = 0;
  
  var Parser = getParser(request);
  this._parser = new Parser(this, this._stream);
  this._parser.handshakeResponse(head);
  
  this.readyState = API.OPEN;
  this.version = this._parser.getVersion();
  
  var event = new API.Event('open');
  event.initEvent('open', false, false);
  this.dispatchEvent(event);
  
  var self = this;
  
  this._stream.addListener('data', function(data) {
    self._parser.parse(data);
  });
  this._stream.addListener('close', function() {
    self.close(1006, '', false);
  });
  this._stream.addListener('error', function() {});
};

var API = require('./websocket/api');
for (var key in API) WebSocket.prototype[key] = API[key];

WebSocket.Client = require('./websocket/client');
module.exports   = WebSocket;

