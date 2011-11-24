var WebSocket = require('../lib/faye/websocket'),
    fs        = require('fs'),
    http      = require('http');

var port = process.argv[2] || 7000;

var server = http.createServer(function(request, response) {
  var path = request.url;
  
  fs.readFile(__dirname + path, function(err, content) {
    var status = err ? 404 : 200;
    response.writeHead(status, {'Content-Type': 'text/html'});
    response.write(content || 'Not found');
    response.end();
  });
});

server.addListener('upgrade', function(request, socket, head) {
  var ws = new WebSocket(request, socket, head);
  console.log('open', ws.url, ws.version);
  
  ws.onmessage = function(event) {
    ws.send(event.data);
  };
  
  ws.onclose = function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
  };
});

server.listen(port);
