// API references:
// 
// * http://dev.w3.org/html5/websockets/
// * http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-eventtarget
// * http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-event

var Stream   = require('stream'),
    util     = require('util'),
    protocol = require('../../vendor/protocol/lib/websocket/protocol'),
    API      = require('./websocket/api');

var WebSocket = function(request, socket, head, supportedProtos, options) {
  this.readable = this.writable = true;

  this._request = request;
  this._stream  = request.socket;
  this._ping    = options && options.ping;
  this._pingId  = 0;

  this._parser = protocol.http(request, {protocols: supportedProtos});
  this.version = this._parser.getVersion();
  this.url = this._parser.url;
  this.readyState = API.CONNECTING;
  this.bufferedAmount = 0;
  this.protocol = '';

  var self = this;
  this._parser.onopen   (function(e) { self._open() });
  this._parser.onmessage(function(e) { self._receiveMessage(e.data) });
  this._parser.onclose  (function(e) { self._finalize(e.reason, e.code) });

  if (this._ping)
    this._pingTimer = setInterval(function() {
      self._pingId += 1;
      self.ping(self._pingId.toString());
    }, this._ping * 1000);

  var catchup = function() { self._stream.removeListener('data', catchup) };
  this._stream.addListener('data', catchup);

  this._stream.setTimeout(0);
  this._stream.setNoDelay(true);
  this._stream.pipe(this._parser.io);
  this._parser.io.pipe(this._stream);
  this._parser.io.write(head);

  ['error', 'end'].forEach(function(event) {
    this._stream.addListener(event, function() { self._finalize('', 1006) });
  }, this);
  this._parser.start();
};
util.inherits(WebSocket, Stream);

for (var key in API) WebSocket.prototype[key] = API[key];

WebSocket.WebSocket   = WebSocket;
WebSocket.Client      = require('./websocket/client');
WebSocket.EventSource = require('./eventsource');
module.exports        = WebSocket;

