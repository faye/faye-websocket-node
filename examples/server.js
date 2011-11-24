var WebSocket = require('../lib/faye/websocket'),
    http      = require('http');

var port = process.argv[2] || 7000;

var server = http.createServer();

server.addListener('upgrade', function(request, socket, head) {
  var ws = new WebSocket(request, socket, head);
  
  ws.onmessage = function(event) {
    ws.send(event.data);
  };
  
  ws.onclose = function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
  };
});

server.listen(port);
