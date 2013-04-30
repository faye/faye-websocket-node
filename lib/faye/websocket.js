// API references:
// 
// * http://dev.w3.org/html5/websockets/
// * http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-eventtarget
// * http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-event

var util     = require('util'),
    protocol = require('../../vendor/protocol/lib/websocket/protocol'),
    API      = require('./websocket/api');

var WebSocket = function(request, socket, body, supportedProtos, options) {
  this._stream  = socket;
  this._ping    = options && options.ping;
  this._pingId  = 0;
  this._parser  = protocol.http(request, {protocols: supportedProtos});

  var self = this;

  var catchup = function() { self._stream.removeListener('data', catchup) };
  this._stream.on('data', catchup);

  this._stream.setTimeout(0);
  this._stream.setNoDelay(true);

  this._parser.io.write(body);
  API.call(this);

  ['error', 'end'].forEach(function(event) {
    this._stream.on(event, function() { self._finalize('', 1006) });
  }, this);

  this._parser.start();
};
util.inherits(WebSocket, API);

WebSocket.WebSocket   = WebSocket;
WebSocket.Client      = require('./websocket/client');
WebSocket.EventSource = require('./eventsource');
module.exports        = WebSocket;

