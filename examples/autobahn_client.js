var WebSocket = require('../lib/faye/websocket'),
    deflate   = require('permessage-deflate'),
    pace      = require('pace');

var host    = 'ws://localhost:9001',
    agent   = 'node-' + process.version,
    cases   = 0,
    options = {extensions: [deflate]};

var socket = new WebSocket.Client(host + '/getCaseCount'),
    url, progress;

socket.onmessage = function(event) {
  console.log('Total cases to run: ' + event.data);
  cases = parseInt(event.data);
  progress = pace(cases);
};

socket.onclose = function() {
  runCase(1);
};

var runCase = function(n) {
  if (n > cases) {
    url = host + '/updateReports?agent=' + encodeURIComponent(agent);
    socket = new WebSocket.Client(url);
    socket.onclose = process.exit;
    return;
  }

  url = host + '/runCase?case=' + n + '&agent=' + encodeURIComponent(agent);
  socket = new WebSocket.Client(url, null, options);
  socket.pipe(socket);

  socket.on('close', function() {
    progress.op();
    runCase(n + 1);
  });
};
