var fs    = require('fs'),
    http  = require('http'),
    https = require('https');

var WebSocket = require('../lib/faye/websocket');

var EchoServer = function(secure) {
  var server = secure
             ? https.createServer({
                 key:  fs.readFileSync(__dirname + '/server.key'),
                 cert: fs.readFileSync(__dirname + '/server.crt')
               })
             : http.createServer();

  server.on('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head, ["echo"]);
    ws.pipe(ws);
  });

  this._httpServer = server;
};

EchoServer.prototype.listen = function(port) {
  this._httpServer.listen(port);
};

EchoServer.prototype.stop = function() {
  this._httpServer.close();
};

module.exports = EchoServer;
