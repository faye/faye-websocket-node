var http = require('http'),
    net  = require('net');

var ProxyServer = function(options) {
  var proxy = http.createServer();
  options   = options || {};

  var onConnect = function(request, frontend, body) {
    var parts   = request.url.split(':'),
        backend = net.connect(parts[1], parts[0]);

    frontend.pipe(backend);
    backend.pipe(frontend);

    backend.on('connect', function() {
      frontend.write('HTTP/1.1 200 OK\r\n\r\n');
    });

    if (!options.debug) return;
    console.log(request.method, request.url, request.headers);

    frontend.on('data', function(data) { console.log('I', data) });
    backend.on( 'data', function(data) { console.log('O', data) });
  };

  proxy.on('connect', onConnect);
  proxy.on('upgrade', onConnect);

  this._proxy = proxy;
};

ProxyServer.prototype.listen = function(port) {
  this._proxy.listen(port);
};

ProxyServer.prototype.stop = function() {
  this._proxy.close();
};

module.exports = ProxyServer;
