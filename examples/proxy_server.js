var ProxyServer = require('../spec/proxy_server');

var proxy = new ProxyServer();
proxy.listen(process.argv[2]);
