var ProxyServer = require('../spec/proxy_server');

var proxy = new ProxyServer({debug: true});
proxy.listen(process.argv[2]);
