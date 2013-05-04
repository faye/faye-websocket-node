var Hybi = require("../../../lib/websocket/protocol/hybi")

JS.Test.describe("Hybi", function() { with(this) {
  define("request", function() {
    return this._request = this._request || {
      headers: {
        "connection":             "Upgrade",
        "upgrade":                "websocket",
        "origin":                 "http://www.example.com",
//        "sec-websocket-extensions": "x-webkit-deflate-frame",
        "sec-websocket-key":      "JFBCWHksyIpXV+6Wlq/9pw==",
        "sec-websocket-version":  "13"
      }
    }
  })

  define("options", function() {
    return this._options = this._options || {masking: false}
  })

  define("protocol", function() {
    if (this._protocol) return this._protocol
    this._protocol = new Hybi(this.request(), "ws://www.example.com/socket", this.options())
    var self = this
    this._protocol.on('open',    function(e) { self.open = true })
    this._protocol.on('message', function(e) { self.message += e.data })
    this._protocol.on('error',   function(e) { self.error = e })
    this._protocol.on('close',   function(e) { self.close = [e.code, e.reason] })
    this._protocol.io.pipe(this.collector())
    return this._protocol
  })

  before(function() {
    this.open = this.error = this.close = false
    this.message = ""
  })

  describe("in the connecting state", function() { with(this) {
    it("starts in the connecting state", function() { with(this) {
      assertEqual( "connecting", protocol().getState() )
    }})

    describe("start", function() { with(this) {
      it("writes the handshake response to the socket", function() { with(this) {
        expect(protocol().io, "emit").given("data", buffer(
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Accept: JdiiuafpBKRqD7eol0y4vJDTsTs=\r\n" +
            "\r\n"))
        protocol().start()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().start() )
      }})

      describe("with subprotocols", function() { with(this) {
        before(function() { with(this) {
          request().headers["sec-websocket-protocol"] = "foo, bar, xmpp"
          options().protocols = ["xmpp"]
        }})

        it("writes the handshake with Sec-WebSocket-Protocol", function() { with(this) {
          expect(protocol().io, "emit").given("data", buffer(
              "HTTP/1.1 101 Switching Protocols\r\n" +
              "Upgrade: websocket\r\n" +
              "Connection: Upgrade\r\n" +
              "Sec-WebSocket-Accept: JdiiuafpBKRqD7eol0y4vJDTsTs=\r\n" +
              "Sec-WebSocket-Protocol: xmpp\r\n" +
              "\r\n"))
          protocol().start()
        }})

        it("sets the subprotocol", function() { with(this) {
          protocol().start()
          assertEqual( "xmpp", protocol().protocol )
        }})
      }})

      it("triggers the onopen event", function() { with(this) {
        protocol().start()
        assertEqual( true, open )
      }})

      it("changes the state to open", function() { with(this) {
        protocol().start()
        assertEqual( "open", protocol().getState() )
      }})

      it("sets the protocol version", function() { with(this) {
        protocol().start()
        assertEqual( "hybi-13", protocol().version )
      }})
    }})

    describe("frame", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().frame("Hello, world")
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().frame("whatever") )
      }})

      it("queues the frames until the handshake has been send", function() { with(this) {
        expect(protocol().io, "emit").given("data", buffer(
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Accept: JdiiuafpBKRqD7eol0y4vJDTsTs=\r\n" +
            "\r\n"))
        expect(protocol().io, "emit").given("data", buffer([0x81, 0x02, 72, 105]))

        protocol().frame("Hi")
        protocol().start()
      }})
    }})

    describe("ping", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().ping()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().ping() )
      }})

      it("queues the ping until the handshake has been send", function() { with(this) {
        expect(protocol().io, "emit").given("data", buffer(
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Accept: JdiiuafpBKRqD7eol0y4vJDTsTs=\r\n" +
            "\r\n"))
        expect(protocol().io, "emit").given("data", buffer([0x89, 0]))

        protocol().ping()
        protocol().start()
      }})
    }})

    describe("close", function() { with(this) {
      it("does not write anything to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().close()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().close() )
      }})

      it("triggers the onclose event", function() { with(this) {
        protocol().close()
        assertEqual( [1000, ""], close )
      }})

      it("changes the state to closed", function() { with(this) {
        protocol().close()
        assertEqual( "closed", protocol().getState() )
      }})
    }})
  }})

  describe("in the open state", function() { with(this) {
    before(function() { this.protocol().start() })

    describe("parse", function() { with(this) {
      define("mask", function() {
        return this._mask = this._mask ||
               [1,2,3,4].map(function() { return Math.floor(Math.random() * 256) })
      })

      define("maskMessage", function(bytes) {
        var output = []
        for (var i = 0, n = bytes.length; i < n; i++) {
          output[i] = bytes[i] ^ this.mask()[i % 4]
        }
        return output
      })

      it("parses unmasked text frames", function() { with(this) {
        protocol().parse([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f])
        assertEqual( "Hello", message )
      }})

      it("parses multiple frames from the same packet", function() { with(this) {
        protocol().parse([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f])
        assertEqual( "HelloHello", message )
      }})

      it("parses empty text frames", function() { with(this) {
        protocol().parse([0x81, 0x00])
        assertEqual( "", message )
      }})

      it("parses fragmented text frames", function() { with(this) {
        protocol().parse([0x01, 0x03, 0x48, 0x65, 0x6c])
        protocol().parse([0x80, 0x02, 0x6c, 0x6f])
        assertEqual( "Hello", message )
      }})

      it("parses masked text frames", function() { with(this) {
        protocol().parse([0x81, 0x85])
        protocol().parse(mask())
        protocol().parse(maskMessage([0x48, 0x65, 0x6c, 0x6c, 0x6f]))
        assertEqual( "Hello", message )
      }})

      it("parses masked empty text frames", function() { with(this) {
        protocol().parse([0x81, 0x80])
        protocol().parse(mask())
        protocol().parse(maskMessage([]))
        assertEqual( "", message )
      }})

      it("parses masked fragmented text frames", function() { with(this) {
        protocol().parse([0x01, 0x81])
        protocol().parse(mask())
        protocol().parse(maskMessage([0x48]))

        protocol().parse([0x80, 0x84])
        protocol().parse(mask())
        protocol().parse(maskMessage([0x65, 0x6c, 0x6c, 0x6f]))

        assertEqual( "Hello", message )
      }})

      it("closes the socket if the frame has an unrecognized opcode", function() { with(this) {
        protocol().parse([0x83, 0x00])
        assertEqual( [0x88, 0x1e, 0x03, 0xea], collector().bytes.slice(0,4) )
        assertEqual( "Unrecognized frame opcode: 3", error.message )
        assertEqual( [1002, "Unrecognized frame opcode: 3"], close )
        assertEqual( "closed", protocol().getState() )
      }})

      it("closes the socket if a close frame is received", function() { with(this) {
        protocol().parse([0x88, 0x07, 0x03, 0xe8, 0x48, 0x65, 0x6c, 0x6c, 0x6f])
        assertEqual( [0x88, 0x07, 0x03, 0xe8, 0x48, 0x65, 0x6c, 0x6c, 0x6f], collector().bytes )
        assertEqual( [1000, "Hello"], close )
        assertEqual( "closed", protocol().getState() )
      }})

      it("parses unmasked multibyte text frames", function() { with(this) {
        protocol().parse([0x81, 0x0b, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf])
        assertEqual( "Apple = ", message )
      }})

      it("parses frames received in several packets", function() { with(this) {
        protocol().parse([0x81, 0x0b, 0x41, 0x70, 0x70, 0x6c])
        protocol().parse([0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf])
        assertEqual( "Apple = ", message )
      }})

      it("parses fragmented multibyte text frames", function() { with(this) {
        protocol().parse([0x01, 0x0a, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3])
        protocol().parse([0x80, 0x01, 0xbf])
        assertEqual( "Apple = ", message )
      }})

      it("parse masked multibyte text frames", function() { with(this) {
        protocol().parse([0x81, 0x8b])
        protocol().parse(mask())
        protocol().parse(maskMessage([0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf]))
        assertEqual( "Apple = ", message )
      }})

      it("parses masked fragmented multibyte text frames", function() { with(this) {
        protocol().parse([0x01, 0x8a])
        protocol().parse(mask())
        protocol().parse(maskMessage([0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3]))

        protocol().parse([0x80, 0x81])
        protocol().parse(mask())
        protocol().parse(maskMessage([0xbf]))

        assertEqual( "Apple = ", message )
      }})

      it("parses unmasked medium-length text frames", function() { with(this) {
        protocol().parse([0x81, 0x7e, 0x00, 0xc8])
        var i = 40, result = ""
        while (i--) {
          protocol().parse([0x48, 0x65, 0x6c, 0x6c, 0x6f])
          result += "Hello"
        }
        assertEqual( result, message )
      }})

      it("returns an error for too-large frames", function() { with(this) {
        protocol().parse([0x81, 0x7f, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
        assertEqual( "WebSocket frame length too large", error.message )
        assertEqual( [1009, "WebSocket frame length too large"], close )
        assertEqual( "closed", protocol().getState() )
      }})

      it("parses masked medium-length text frames", function() { with(this) {
        protocol().parse([0x81, 0xfe, 0x00, 0xc8])
        protocol().parse(mask())
        var i = 40, result = "", packet = []
        while (i--) {
          packet = packet.concat([0x48, 0x65, 0x6c, 0x6c, 0x6f])
          result += "Hello"
        }
        protocol().parse(maskMessage(packet))
        assertEqual( result, message )
      }})

      it("replies to pings with a pong", function() { with(this) {
        protocol().parse([0x89, 0x04, 0x4f, 0x48, 0x41, 0x49])
        assertEqual( [0x8a, 0x04, 0x4f, 0x48, 0x41, 0x49], collector().bytes )
      }})
    }})

    describe("frame", function() { with(this) {
      it("formats the given string as a WebSocket frame", function() { with(this) {
        protocol().frame("Hello")
        assertEqual( [0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f], collector().bytes )
      }})

      it("formats a byte array as a binary WebSocket frame", function() { with(this) {
        protocol().frame([0x48, 0x65, 0x6c])
        assertEqual( [0x82, 0x03, 0x48, 0x65, 0x6c], collector().bytes )
      }})

      it("encodes multibyte characters correctly", function() { with(this) {
        protocol().frame("Apple = ")
        assertEqual( [0x81, 0x0b, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf], collector().bytes )
      }})

      it("encodes medium-length strings using extra length bytes", function() { with(this) {
        var i = 40, frame = [0x81, 0x7e, 0x00, 0xc8], string = ""
        while (i--) {
          string += "Hello"
          frame = frame.concat([0x48, 0x65, 0x6c, 0x6c, 0x6f])
        }
        protocol().frame(string)
        assertEqual( frame, collector(). bytes )
      }})

      it("encodes close frames with an error code", function() { with(this) {
        protocol().frame("Hello", "close", 1002)
        assertEqual( [0x88, 0x07, 0x03, 0xea, 0x48, 0x65, 0x6c, 0x6c, 0x6f], collector().bytes )
      }})

      it("encodes pong frames", function() { with(this) {
        protocol().frame("", "pong")
        assertEqual( [0x8a, 0x00], collector().bytes )
      }})
    }})

    describe("ping", function() { with(this) {
      it("writes a ping frame to the socket", function() { with(this) {
        protocol().ping("mic check")
        assertEqual( [0x89, 0x09, 0x6d, 0x69, 0x63, 0x20, 0x63, 0x68, 0x65, 0x63, 0x6b], collector().bytes )
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().ping() )
      }})

      it("runs the given callback on mathing pong", function() { with(this) {
        var reply = null
        protocol().ping("Hi", function() { reply = true })
        protocol().parse([0x8a, 0x02, 72, 105])
        assert( reply )
      }})

      it("does not run the callback on non-matching pong", function() { with(this) {
        var reply = null
        protocol().ping("Hi", function() { reply = true })
        protocol().parse([0x8a, 0x03, 119, 97, 116])
        assert( !reply )
      }})
    }})

    describe("close", function() { with(this) {
      it("writes a close frame to the socket", function() { with(this) {
        protocol().close("<%= reasons %>", 1003)
        assertEqual( [0x88, 0x10, 0x03, 0xeb, 0x3c, 0x25, 0x3d, 0x20, 0x72, 0x65, 0x61, 0x73, 0x6f, 0x6e, 0x73, 0x20, 0x25, 0x3e], collector().bytes )
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().close() )
      }})

      it("does not trigger the close event", function() { with(this) {
        protocol().close()
        assertEqual( false, close )
      }})

      it("does not trigger the onerror event", function() { with(this) {
        protocol().close()
        assertEqual( false, error )
      }})

      it("changes the state to closing", function() { with(this) {
        protocol().close()
        assertEqual( "closing", protocol().getState() )
      }})
    }})
  }})

  describe("when masking is required", function() { with(this) {
    before(function() {
      this.options().requireMasking = true
      this.protocol().start()
    })

    it("does not emit a message", function() { with(this) {
      protocol().parse([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f])
      assertEqual( "", message )
    }})

    it("returns an error", function() { with(this) {
      protocol().parse([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f])
      assertEqual( "Received unmasked frame but masking is required", error.message )
      assertEqual( [1003, "Received unmasked frame but masking is required"], close )
    }})
  }})

  describe("in the closing state", function() { with(this) {
    before(function() {
      this.protocol().start()
      this.protocol().close()
    })

    describe("frame", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().frame("dropped")
      }})

      it("returns false", function() { with(this) {
        assertEqual( false, protocol().frame("wut") )
      }})
    }})

    describe("ping", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().ping()
      }})

      it("returns false", function() { with(this) {
        assertEqual( false, protocol().ping() )
      }})
    }})

    describe("close", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().close()
      }})

      it("returns false", function() { with(this) {
        assertEqual( false, protocol().close() )
      }})
    }})

    describe("receiving a close frame", function() { with(this) {
      before(function() {
        this.protocol().parse([0x88, 0x04, 0x03, 0xe9, 0x4f, 0x4b])
      })

      it("triggers the onclose event", function() { with(this) {
        assertEqual( [1001, "OK"], close )
      }})

      it("changes the state to closed", function() { with(this) {
        assertEqual( "closed", protocol().getState() )
      }})
    }})
  }})

  describe("in the closed state", function() { with(this) {
    before(function() {
      this.protocol().start()
      this.protocol().close()
      this.protocol().parse([0x88, 0x02, 0x03, 0xea])
    })

    describe("frame", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().frame("dropped")
      }})

      it("returns false", function() { with(this) {
        assertEqual( false, protocol().frame("wut") )
      }})
    }})

    describe("ping", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().ping()
      }})

      it("returns false", function() { with(this) {
        assertEqual( false, protocol().ping() )
      }})
    }})

    describe("close", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(protocol().io, "emit").exactly(0)
        protocol().close()
      }})

      it("returns false", function() { with(this) {
        assertEqual( false, protocol().close() )
      }})

      it("leaves the state as closed", function() { with(this) {
        protocol().close()
        assertEqual( "closed", protocol().getState() )
      }})
    }})
  }})
}})
