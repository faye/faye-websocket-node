# faye-websocket

This is a robust, general-purpose WebSocket implementation extracted from the
[Faye](http://faye.jcoglan.com) project. It provides classes for easily building
WebSocket servers and clients in Node. It does not provide a server itself, but
rather makes it easy to handle WebSocket connections within an existing
[Node](http://nodejs.org/) application. It does not provide any abstraction
other than the standard [WebSocket API](http://dev.w3.org/html5/websockets/).

The server-side socket can process [draft-75](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-75),
[draft-76](http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol-76),
[hybi-07](http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-07)
and later versions of the protocol. It selects protocol versions automatically,
supports both `text` and `binary` messages, and transparently handles `ping`,
`pong`, `close` and fragmented messages.


## Accepting WebSocket connections in Node

You can handle WebSockets on the server side by listening for HTTP Upgrade
requests, and creating a new socket for the request. This socket object exposes
the usual WebSocket methods for receiving and sending messages. For example this
is how you'd implement an echo server:

```js
var WebSocket = require('faye-websocket'),
    http      = require('http');

var server = http.createServer();

server.addListener('upgrade', function(request, socket, head) {
  var ws = new WebSocket(request, socket, head);
  
  ws.onmessage = function(event) {
    ws.send(event.data);
  };
  
  ws.onclose = function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
  };
});

server.listen(8000);
```

If you want to add subprotocol negotiation through the `Sec-WebSocket-Protocol`
header, pass a list of supported protocols when constructing the socket:

```js
var ws = new WebSocket(request, socket, head, ['irc', 'amqp']);
```

If the client and server agree on a subprotocol, you can find out which one is
in use through the `ws.protocol` property.


## Using the WebSocket client

The client supports both the plain-text `ws` protocol and the encrypted `wss`
protocol, and has exactly the same interface as a socket you would use in a web
browser. On the wire it identifies itself as hybi-13, though it's compatible
with servers speaking later versions of the protocol.

```js
var WebSocket = require('faye-websocket'),
    ws        = new WebSocket.Client('ws://www.example.com/');

ws.onopen = function(event) {
  console.log('open');
  ws.send('Hello, world!');
};

ws.onmessage = function(event) {
  console.log('message', event.data);
};

ws.onclose = function(event) {
  console.log('close', event.code, event.reason);
  ws = null;
};
```

If you want to add subprotocol negotiation through the `Sec-WebSocket-Protocol`
header, pass a list of supported protocols when constructing the socket:

```js
var ws = new WebSocket.Client('ws://www.example.com/', ['irc', 'amqp']);
```

If the client and server agree on a subprotocol, you can find out which one is
in use through the `ws.protocol` property. If the server does not support any of
the client's requested protocols, the connection is closed.


## WebSocket API

The WebSocket API consists of several event handlers and a method for sending
messages.

* <b><tt>onopen</tt></b> fires when the socket connection is established. Event
  has no attributes.
* <b><tt>onerror</tt></b> fires when the connection attempt fails. Event has no
  attributes.
* <b><tt>onmessage</tt></b> fires when the socket receives a message. Event has
  one attribute, <b><tt>data</tt></b>, which is either a `String` (for text
  frames) or a `Buffer` (for binary frames).
* <b><tt>onclose</tt></b> fires when either the client or the server closes the
  connection. Event has two optional attributes, <b><tt>code</tt></b> and
  <b><tt>reason</tt></b>, that expose the status code and message sent by the
  peer that closed the connection.
* <b><tt>send(message)</tt></b> accepts either a `String` or a `Buffer` and
  sends a text or binary message over the connection to the other peer.
* <b><tt>close(code, reason)</tt></b> closes the connection, sending the given
  status code and reason text, both of which are optional.
* <b><tt>protocol</tt></b> is a string or `null` identifying the subprotocol the
  socket is using.


## License

(The MIT License)

Copyright (c) 2009-2011 James Coglan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

