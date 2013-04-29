/**

Streams in a WebSocket connection
---------------------------------

We model a WebSocket as two duplex streams: one stream is for the wire protocol
over an I/O socket, and the other is for incoming/outgoing messages.


                        +----------+      +---------+      +----------+
    [1] write(chunk) -->| ~~~~~~~~ +----->| parse() +----->| ~~~~~~~~ +--> emit('data') [2]
                        |          |      +----+----+      |          |
                        |          |           |           |          |
                        |    IO    |           | [5]       | Messages |
                        |          |           V           |          |
                        |          |      +---------+      |          |
    [4] emit('data') <--+ ~~~~~~~~ |<-----+ frame() |<-----+ ~~~~~~~~ |<-- write(chunk) [3]
                        +----------+      +---------+      +----------+


Message transfer in each direction is simple: IO receives a byte stream [1] and
sends this stream for parsing. The parser will periodically emit a complete
message text on the Messages stream [2]. Similarly, when messages are written
to the Messages stream [3], they are framed using the WebSocket wire format and
emitted via IO [4].

There is a feedback loop via [5] since some input from [1] will be things like
ping, pong and close frames. In these cases the protocol responds by emitting
responses directly back to [4] rather than emitting messages via [2].

For the purposes of flow control, we consider the sources of each Readable
stream to be as follows:

* [2] receives input from [1]
* [4] receives input from [1] and [3]

The classes below express the relationships described above without prescribing
anything about how parse() and frame() work, other than assuming they emit
'data' events to the IO and Messages streams. They will work with any protocol
handler having these two methods.


Node streaming API
------------------

Readable: readable
          pause(), resume()
          emit('data'), emit('end'), emit('close'), emit('error')

Writable: writable
          write(chunk), end(chunk), destroy()
          emit('drain'), emit('close'), emit('error')
**/


var Stream = require('stream'),
    util   = require('util');


var IO = function(handler) {
  this.readable = this.writable = true;
  this._paused  = false;
  this._handler = handler;
};
util.inherits(IO, Stream);

// The IO pause() and resume() methods will be called when the socket we are
// piping to gets backed up and drains. Since IO output [4] comes from IO input
// [1] and Messages input [3], we need to tell both of those to return false
// from write() when this stream is paused.

IO.prototype.pause = function() {
  this._paused = true;
  this._handler.messages._paused = true;
};

IO.prototype.resume = function() {
  this._paused = false;
  this.emit('drain');

  var messages = this._handler.messages;
  messages._paused = false;
  messages.emit('drain');
};

// When we receive input from a socket, send it to the parser and tell the
// source whether to back off.
IO.prototype.write = function(chunk) {
  if (!this.writable) return false;
  this._handler.parse(chunk);
  return !this._paused;
};

// The IO end() method will be called when the socket piping into it emits
// 'close' or 'end', i.e. the socket is closed. In this situation the Messages
// stream will not emit any more data so we emit 'end'.
IO.prototype.end = function(chunk) {
  if (!this.writable) return;
  if (chunk) this.write(chunk);
  this.writable = false;
  var messages = this._handler.messages;
  messages.readable = false;
  messages.emit('end');
};


var Messages = function(handler) {
  this.readable = this.writable = true;
  this._paused  = false;
  this._handler = handler;
};
util.inherits(Messages, Stream);

// The Messages pause() and resume() methods will be called when the app that's
// processing the messages gets backed up and drained. If we're emitting
// messages too fast we should tell the source to slow down. Message output [2]
// comes from IO input [1].

Messages.prototype.pause = function() {
  this._handler.io._paused = true;
};

Messages.prototype.resume = function() {
  this._handler.io._paused = false;
  this._handler.io.emit('drain');
};

// When we receive messages from the user, send them to the formatter and tell
// the source whether to back off.
Messages.prototype.write = function(message) {
  if (!this.writable) return false;
  this._handler.frame(message);
  return !this._paused;
};

// The Messages end() method will be caused when a stream piping into it emits
// 'end'. Many streams may be piped into the WebSocket and one of them ending
// does not mean the whole socket is done, so just process the input and move
// on leaving the socket open.
Messages.prototype.end = function(message) {
  if (message) this.write(message);
};


exports.IO = IO;
exports.Messages = Messages;

