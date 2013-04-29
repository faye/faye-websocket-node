# websocket-protocol [![Build Status](https://travis-ci.org/faye/websocket-protocol-node.png)](https://travis-ci.org/faye/websocket-protocol-node)

This module provides a complete implementation of the WebSocket protocols that
can be hooked up to any I/O stream. It aims to simplify things by decoupling
the protocol details from the I/O layer, such that users only need to implement
code to stream data in and out of it without needing to know anything about how
the protocol actually works. Think of it as a complete WebSocket system with
pluggable I/O.

Due to this design, you get a lot of things for free. In particular, if you
hook this module up to some I/O object, it will do all of this for you:

* Select the correct server-side protocol handler to talk to the client
* Generate and send both server- and client-side handshakes
* Recognize when the handshake phase completes and the WS protocol begins
* Negotiate subprotocol selection based on `Sec-WebSocket-Protocol`
* Buffer sent messages until the handshake process is finished
* Deal with proxies that defer delivery of the draft-76 handshake body
* Notify you when the socket is open and closed and when messages arrive
* Recombine fragmented messages
* Dispatch text, binary, ping and close frames
* Manage the socket-closing handshake process
* Automatically reply to ping frames with a matching pong
* Apply masking to messages sent by the client

This library was originally extracted from the [Faye](http://faye.jcoglan.com)
project but now aims to provide simple WebSocket support for any Node-based
project.


## Usage

This module provides protocol handlers that have the same interface on the
server and on the client. A WebSocket handler is an object with two duplex
streams attached; one for incoming/outgoing messages and one for managing the
wire protocol over an I/O stream. The full API is described below.


### Server-side

A Node webserver emits a special event for 'upgrade' requests, and this is
where you should handle WebSockets. You first check whether the request is a
WebSocket, and if so you can create a handler and attach the request's I/O
stream to it.

```js
var http = require('http'),
    websocket = require('websocket-protocol');

var server = http.createServer();

server.on('upgrade', function(request, socket, head) {
  if (!protocol.isWebSocket(request)) return;

  var handler = websocket.http(request);

  socket.pipe(handler.io);
  handler.io.pipe(socket);

  handler.messages.on('data', function(message) {
    console.log('Got a message', message);
  });

  handler.start();
};
```


### Client-side

Similarly, to implement a WebSocket client you just need to make a handler by
passing in a URL. After this you use the handler API as described below to
process incoming data and send outgoing data.


```js
var net = require('net'),
    websocket = require('websocket-protocol');

var handler = websocket.client('ws://www.example.com/socket'),
    tcp = net.createConnection(80, 'www.example.com');

tcp.pipe(handler.io);
handler.io.pipe(tcp);

handler.messages.on('data', function(message) {
  console.log('Got a message', message);
});

tcp.on('connect', function() {
  handler.start();
});
```


### Handler API

Handlers are created using one of the following methods:

```js
handler = websocket.http(request, options)
handler = websocket.client(url, options)
```

The `http` method returns a handler chosen using the headers from a Node HTTP
request object. The `client` method always returns a handler for the RFC
version of the protocol with masking enabled on outgoing frames.

The `options` argument is optional, and is an object. It may contain the
following fields:

* `protocols` - an array of strings representing acceptable subprotocols for
  use over the socket. The handler will negotiate one of these to use via the
  `Sec-WebSocket-Protocol` header if supported by the other peer.

A handler has two duplex streams attached to it:

* `handler.io` - this stream should be attached to an I/O socket like a TCP
  stream. Pipe incoming TCP chunks to this stream for them to be parsed, and
  pipe this stream back into TCP to send outgoing frames.
* `handler.messages` - this stream emits messages received over the WebSocket.
  Writing to it sends messages to the other peer by emitting frames via the
  `handler.io` stream.

All handlers respond to the following API methods, but some of them are no-ops
depending on whether the client supports the behaviour.

Note that most of these methods are commands: if they produce data that should
be sent over the socket, they will give this to you by emitting `data` events
on the `handler.io` stream.

#### `handler.onopen(function(event) {})`

Sets the callback to execute when the socket becomes open.

#### `handler.onmessage(function(event) {})`

Sets the callback to execute when a message is received. `event` will have a
`data` attribute containing either a string in the case of a text message or a
`Buffer` in the case of a binary message.

You can also listen for messages using the `handler.messages.on('data')` event,
which emits strings for text messages and buffers for binary messages.

#### `handler.onclose(function(event) {})`

Sets the callback to execute when the socket becomes closed. The `event` object
has `code` and `reason` attributes.

#### `handler.start()`

Initiates the protocol by sending the handshake - either the response for a
server-side handler or the request for a client-side one. This should be the
first method you invoke.  Returns `true` iff a handshake was sent.

#### `handler.parse(string)`

Takes a string and parses it, potentially resulting in message events being
emitted (see `onmessage` above) or in data being sent to `handler.io`.  You
should send all data you receive via I/O to this method by piping a stream into
`handler.io`.

#### `handler.text(string)`

Sends a text message over the socket. If the socket handshake is not yet
complete, the message will be queued until it is. Returns `true` if the message
was sent or queued, and `false` if the socket can no longer send messages.

This method is equivalent to `handler.messages.write(string)`.

#### `handler.binary(buffer)`

Takes a `Buffer` and sends it as a binary message. Will queue and return `true`
or `false` the same way as the `text` method. It will also return `false` if
the handler does not support binary messages.

This method is equivalent to `handler.messages.write(buffer)`.

#### `handler.ping(string = '', function() {})`

Sends a ping frame over the socket, queueing it if necessary. `string` and the
callback are both optional. If a callback is given, it will be invoked when the
socket receives a pong frame whose content matches `string`. Returns `false` if
frames can no longer be sent, or if the handler does not support ping/pong.

#### `handler.close()`

Initiates the closing handshake if the socket is still open. For handlers with
no closing handshake, this will result in the immediate execution of the
`onclose` handler. For handlers with a closing handshake, this sends a closing
frame and `onclose` will execute when a response is received or a protocol
error occurs.

#### `handler.getVersion()`

Returns the WebSocket version in use as a string. Will either be `hixie-75`,
`hixie-76` or `hybi-$version`.

#### `handler.protocol`

Returns a string containing the selected subprotocol, if any was agreed upon
using the `Sec-WebSocket-Protocol` mechanism. This value becomes available
after `onopen` has fired.


## License

(The MIT License)

Copyright (c) 2009-2013 James Coglan

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

