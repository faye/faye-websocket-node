var http = require('http'),
    net  = require('net');

var ProxyServer = function() {
  var proxy = http.createServer();

  proxy.on('connect', function(request, socket, body) {
    var parts = request.url.split(':'),
        conn  = net.connect(parts[1], parts[0]);

    socket.pipe(conn).pipe(socket);

    conn.on('connect', function() {
      socket.write('HTTP/1.1 200 OK\r\n\r\n');
    });
  });

  this._proxy = proxy;
};

ProxyServer.prototype.listen = function(port) {
  this._proxy.listen(port);
};

ProxyServer.prototype.stop = function() {
  this._proxy.close();
};

module.exports = ProxyServer;
