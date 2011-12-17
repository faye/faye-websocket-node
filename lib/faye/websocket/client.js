var API = require('./api'),
    net = require('net'),
    tls = require('tls');

var Protocol8Parser = require('./protocol8_parser');

var Client = function(url) {
  this.url  = url;
  this._uri = require('url').parse(url);
  
  this.readyState = API.CONNECTING;
  this.bufferedAmount = 0;
  
  var secure     = (this._uri.protocol === 'wss:'),
      self       = this,
      onConnect  = function() { self._onConnect() },
      
      connection = secure
                 ? tls.connect(this._uri.port || 443, this._uri.hostname, onConnect)
                 : net.createConnection(this._uri.port || 80, this._uri.hostname);
  
  this._parser = new Protocol8Parser(this, connection, {masking: true});
  this._stream = connection;
  
  if (!secure) connection.addListener('connect', onConnect);
  
  connection.addListener('data', function(data) {
    self._onData(data);
  });
  connection.addListener('close', function() {
    self.close(1006, '', false);
  });
  connection.addListener('error', function() {});
};
  
Client.prototype._onConnect = function() {
  this._handshake = this._parser.createHandshake(this._uri, this._stream);
  this._message = [];
  try {
    this._stream.write(this._handshake.requestData(), 'binary');
  } catch (e) {}
};

Client.prototype._onData = function(data) {
  switch (this.readyState) {
    case API.CONNECTING:
      var bytes = this._handshake.parse(data);
      for (var i = 0, n = bytes.length; i < n; i++)
        this._message.push(bytes[i]);
      
      if (!this._handshake.isComplete()) return;
      
      if (this._handshake.isValid()) {
        this.readyState = API.OPEN;
        var event = new API.Event('open');
        event.initEvent('open', false, false);
        this.dispatchEvent(event);
        
        this._parser.parse(this._message);
        
      } else {
        this.readyState = API.CLOSED;
        var event = new API.Event('close');
        event.initEvent('close', false, false);
        this.dispatchEvent(event);
      }
      break;
      
    case API.OPEN:
    case API.CLOSING:
      this._parser.parse(data);
  }
};

for (var key in API) Client.prototype[key] = API[key];

module.exports = Client;

