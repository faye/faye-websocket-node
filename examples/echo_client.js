var WebSocket = require('../lib/faye/websocket'),
    fs = require('fs');

var url   = process.argv[2],
    proxy = process.argv[3],
    ca    = fs.readFileSync(__dirname + '/../spec/server.crt'),
    ws    = new WebSocket.Client(url, null, {proxy: proxy, ca: ca});

ws.onopen = function() {
  console.log('[socket open]');
  ws.send('mic check');
};

ws.onclose = function(close) {
  console.log('[socket close]', close.code, close.reason);
};

ws.onerror = function(error) {
  console.log('[socket error]', error.message);
};

ws.onmessage = function(message) {
  console.log('[socket message]', message.data);
};
