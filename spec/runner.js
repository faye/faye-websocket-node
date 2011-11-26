require('jsclass')

var WebSocket = require('../lib/faye/websocket'),
    fs        = require('fs'),
    http      = require('http'),
    https     = require('https')


JS.ENV.FakeSocket = function() {
  this._fragments = []
}
FakeSocket.prototype.write = function(buffer, encoding) {
  this._fragments.push([buffer, encoding])
}
FakeSocket.prototype.read = function() {
  var output = []
  this._fragments.forEach(function(buffer, i) {
    for (var j = 0, n = buffer[0].length; j < n; j++)
    output.push(buffer[0][j])
  })
  return output
}
FakeSocket.prototype.addListener = function() {}


JS.ENV.EchoServer = function() {}
EchoServer.prototype.listen = function(port, ssl) {
  var server = ssl
             ? https.createServer({
                 key:  fs.readFileSync(__dirname + '/server.key'),
                 cert: fs.readFileSync(__dirname + '/server.crt')
               })
             : http.createServer()
  
  server.addListener('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head)
    ws.onmessage = function(event) {
      ws.send(event.data)
    }
  })
  this._httpServer = server
  server.listen(port)
}
EchoServer.prototype.stop = function(callback, scope) {
  this._httpServer.addListener('close', function() {
    if (callback) callback.call(scope);
  });
  this._httpServer.close();
}


JS.Packages(function() { with(this) {
  autoload(/.*Spec/, {from: 'spec/faye/websocket'})
}})


JS.require('JS.Test', function() {
  JS.require( 'ClientSpec',
              'Draft75ParserSpec',
              'Protocol8ParserSpec',
              JS.Test.method('autorun'))
})

