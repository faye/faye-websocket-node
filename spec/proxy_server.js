var fs    = require('fs'),
    http  = require('http'),
    https = require('https'),
    net   = require('net'),
    url   = require('url');

var AGENTS = {'http:': http, 'https:': https},
    PORTS  = {'http:': 80,   'https:': 443};

var ProxyServer = function(options) {
  var proxy = options.tls
            ? https.createServer({
                key:  fs.readFileSync(__dirname + '/server.key'),
                cert: fs.readFileSync(__dirname + '/server.crt')
              })
            : http.createServer();

  options = options || {};

  var onRequest = function(request, response) {
    if (options.debug) console.log(request.method, request.url, request.headers);

    var uri     = url.parse(request.url),
        agent   = AGENTS[uri.protocol],
        headers = {};

    for (var key in request.headers) {
      if (key.split('-')[0] !== 'proxy') headers[key] = request.headers[key];
    }

    var backend = agent.request({
      method:  request.method,
      host:    uri.hostname,
      port:    uri.port || PORTS[uri.protocol],
      path:    uri.path,
      headers: headers,
      rejectUnauthorized: false
    });

    request.pipe(backend);

    backend.on('response', function(resp) {
      if (options.debug) console.log(resp.statusCode, resp.headers);
      response.writeHead(resp.statusCode, resp.headers);
      resp.pipe(response);
    });
  };

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

  proxy.on('request', onRequest);
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
