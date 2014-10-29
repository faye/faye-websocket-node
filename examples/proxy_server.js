var http = require('http'),
    net  = require('net');

var proxy = http.createServer(),
    port  = process.argv[2] || 4000;

proxy.on('connect', function(request, socket, body) {
  var parts = request.url.split(':'),
      conn  = net.connect(parts[1], parts[0]);

  console.log(request.method, request.url, request.headers);

  socket.on('data', function(buffer) {
    console.log('IN', buffer);
  });
  conn.on('data', function(buffer) {
    console.log('OUT', buffer);
  });

  socket.pipe(conn).pipe(socket);
  socket.write('HTTP/1.1 200 OK\r\n\r\n');
});

proxy.listen(port);
