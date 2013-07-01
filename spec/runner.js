var WebSocket = require('../lib/faye/websocket'),
    fs        = require('fs'),
    http      = require('http'),
    https     = require('https'),
    test      = require('jstest').Test


EchoServer = function() {}
EchoServer.prototype.listen = function(port, ssl) {
  var server = ssl
             ? https.createServer({
                 key:  fs.readFileSync(__dirname + '/server.key'),
                 cert: fs.readFileSync(__dirname + '/server.crt')
               })
             : http.createServer()

  server.on('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head, ["echo"])
    ws.pipe(ws)
  })
  this._httpServer = server
  server.listen(port)
}
EchoServer.prototype.stop = function(callback, scope) {
  this._httpServer.on('close', function() {
    if (callback) callback.call(scope);
  });
  this._httpServer.close();
}


require('./faye/websocket/client_spec')

