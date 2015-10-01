var Draft76 = require("../../../lib/websocket/driver/draft76"),
    test    = require('jstest').Test

test.describe("Draft76", function() { with(this) {
  BODY = new Buffer([0x91, 0x25, 0x3e, 0xd3, 0xa9, 0xe7, 0x6a, 0x88])

  define("body", function() {
    return BODY
  })

  define("response", function() {
    return [0xb4, 0x9c, 0x6e, 0x40, 0x53, 0x04, 0x04, 0x26, 0xe5, 0x1b, 0xbf, 0x6c, 0xb7, 0x9f, 0x1d, 0xf9]
  })

  define("request", function() {
    return this._request = this._request || {
      headers: {
        "connection":         "Upgrade",
        "upgrade":            "WebSocket",
        "origin":             "http://www.example.com",
        "sec-websocket-key1": "1   38 wZ3f9 23O0 3l 0r",
        "sec-websocket-key2": "27   0E 6 2  1665:< ;U 1H"
      }
    }
  })

  define("options", function() {
    return this._options = this._options || {masking: false}
  })

  define("driver", function() {
    if (this._driver) return this._driver
    this._driver = new Draft76(this.request(), "ws://www.example.com/socket", this.options())
    var self = this
    this._driver.on('open',    function(e) { self.open = true })
    this._driver.on('message', function(e) { self.message += e.data })
    this._driver.on('error',   function(e) { self.error = e })
    this._driver.on('close',   function(e) { self.close = true })
    this._driver.io.pipe(this.collector())
    this._driver.io.write(this.body())
    return this._driver
  })

  before(function() {
    this.open = this.close = false
    this.message = ""
  })

  describe("in the connecting state", function() { with(this) {
    it("starts in the connecting state", function() { with(this) {
      assertEqual( "connecting", driver().getState() )
    }})

    describe("start", function() { with(this) {
      it("writes the handshake response to the socket", function() { with(this) {
        expect(driver().io, "emit").given("data", buffer(
            "HTTP/1.1 101 WebSocket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Origin: http://www.example.com\r\n" +
            "Sec-WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
        expect(driver().io, "emit").given("data", buffer(response()))
        driver().start()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, driver().start() )
      }})

      it("triggers the onopen event", function() { with(this) {
        driver().start()
        assertEqual( true, open )
      }})

      it("changes the state to open", function() { with(this) {
        driver().start()
        assertEqual( "open", driver().getState() )
      }})

      it("sets the protocol version", function() { with(this) {
        driver().start()
        assertEqual( "hixie-76", driver().version )
      }})

      describe("with an invalid key header", function() { with(this) {
        before(function() { with(this) {
          request().headers["sec-websocket-key1"] = "2 L785 8o% s9Sy9@V. 4<1P5"
        }})

        it("writes a closing frame to the socket", function() { with(this) {
          expect(driver().io, "emit").given("data", buffer([0xff, 0x00]))
          driver().start()
        }})

        it("does not trigger the onopen event", function() { with(this) {
          driver().start()
          assertEqual( false, open )
        }})

        it("triggers the onerror event", function() { with(this) {
          driver().start()
          assertEqual( "Client sent invalid Sec-WebSocket-Key headers", error.message )
        }})

        it("triggers the onclose event", function() { with(this) {
          driver().start()
          assertEqual( true, close )
        }})

        it("changes the state to closed", function() { with(this) {
          driver().start()
          assertEqual( "closed", driver().getState()  )
        }})
      }})
    }})

    describe("frame", function() { with(this) {
      it("does not write to the socket", function() { with(this) {
        expect(driver().io, "emit").exactly(0)
        driver().frame("Hello, world")
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, driver().frame("whatever") )
      }})

      it("queues the frames until the handshake has been sent", function() { with(this) {
        expect(driver().io, "emit").given("data", buffer(
            "HTTP/1.1 101 WebSocket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Origin: http://www.example.com\r\n" +
            "Sec-WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
        expect(driver().io, "emit").given("data", buffer(response()))
        expect(driver().io, "emit").given("data", buffer([0x00, 72, 105, 0xff]))

        driver().frame("Hi")
        driver().start()
      }})
    }})

    describe("with no request body", function() { with(this) {
      define("body", function() {
        return new Buffer([])
      })

      it("writes the handshake response with no body", function() { with(this) {
        expect(driver().io, "emit").given("data", buffer(
            "HTTP/1.1 101 WebSocket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Origin: http://www.example.com\r\n" +
            "Sec-WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
        driver().start()
      }})

      it("does not trigger the onopen event", function() { with(this) {
        driver().start()
        assertEqual( false, open )
      }})

      it("leaves the protocol in the connecting state", function() { with(this) {
        driver().start()
        assertEqual( "connecting", driver().getState() )
      }})

      describe("when the request body is received", function() { with(this) {
        before(function() { this.driver().start() })

        it("sends the response body", function() { with(this) {
          expect(driver().io, "emit").given("data", buffer(response()))
          driver().parse(BODY)
        }})

        it("triggers the onopen event", function() { with(this) {
          driver().parse(BODY)
          assertEqual( true, open )
        }})

        it("changes the state to open", function() { with(this) {
          driver().parse(BODY)
          assertEqual( "open", driver().getState() )
        }})

        it("sends any frames queued before the handshake was complete", function() { with(this) {
          expect(driver().io, "emit").given("data", buffer(response()))
          expect(driver().io, "emit").given("data", buffer([0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0xff]))
          driver().frame("hello")
          driver().parse(BODY)
        }})
      }})
    }})
  }})

  itShouldBehaveLike("draft-75 protocol")

  describe("in the open state", function() { with(this) {
    before(function() { this.driver().start() })

    describe("parse", function() { with(this) {
      it("closes the socket if a close frame is received", function() { with(this) {
        driver().parse([0xff, 0x00])
        assertEqual( true, close )
        assertEqual( "closed", driver().getState() )
      }})
    }})

    describe("close", function() { with(this) {
      it("writes a close message to the socket", function() { with(this) {
        expect(driver().io, "emit").given("data", buffer([0xff, 0x00]))
        driver().close()
      }})
    }})
  }})
}})
