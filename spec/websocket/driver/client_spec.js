var Client = require("../../../lib/websocket/driver/client"),
    test   = require('jstest').Test

test.describe("Client", function() { with(this) {
    define("options", function() {
    return this._options = this._options || {protocols: this.protocols()}
  })

  define("protocols", function() {
    null
  })

  define("url", function() {
    return "ws://www.example.com/socket"
  })

  define("driver", function() {
    if (this._driver) return this._driver
    this._driver = new Client(this.url(), this.options())
    var self = this
    this._driver.on('open',    function(e) { self.open = true })
    this._driver.on('message', function(e) { self.message += e.data })
    this._driver.on('error',   function(e) { self.error = e })
    this._driver.on('close',   function(e) { self.close = [e.code, e.reason] })
    var collector = this.collector()
    this._driver.io.on("data", function(d) { collector.write(d) })
    return this._driver
  })

  define("key", function() {
    return "2vBVWg4Qyk3ZoM/5d3QD9Q=="
  })

  define("response", function() {
    return "HTTP/1.1 101 Switching Protocols\r\n" +
           "Upgrade: websocket\r\n" +
           "Connection: Upgrade\r\n" +
           "Sec-WebSocket-Accept: QV3I5XUXU2CdhtjixE7QCkCcMZM=\r\n" +
           "\r\n"
  })

  before(function() {
    this.stub(Client, "generateKey").returns(this.key())
    this.open = this.error = this.close = false
    this.message = ""
  })

  describe("in the beginning state", function() { with(this) {
    it("starts in no state", function() { with(this) {
      assertEqual( null, driver().getState() )
    }})

    describe("close", function() { with(this) {
      it("changes the state to closed", function() { with(this) {
        driver().close()
        assertEqual( "closed", driver().getState() )
        assertEqual( [1000, ''], close )
      }})
    }})

    describe("start", function() { with(this) {
      it("writes the handshake request to the socket", function() { with(this) {
        expect(driver().io, "emit").given("data", buffer(
            "GET /socket HTTP/1.1\r\n" +
            "Host: www.example.com\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Key: 2vBVWg4Qyk3ZoM/5d3QD9Q==\r\n" +
            "Sec-WebSocket-Version: 13\r\n" +
            "\r\n"))
        driver().start()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, driver().start() )
      }})

      describe("with subprotocols", function() { with(this) {
        define("protocols", function() { return ["foo", "bar", "xmpp"] })

        it("writes the handshake with Sec-WebSocket-Protocol", function() { with(this) {
          expect(driver().io, "emit").given("data", buffer(
              "GET /socket HTTP/1.1\r\n" +
              "Host: www.example.com\r\n" +
              "Upgrade: websocket\r\n" +
              "Connection: Upgrade\r\n" +
              "Sec-WebSocket-Key: 2vBVWg4Qyk3ZoM/5d3QD9Q==\r\n" +
              "Sec-WebSocket-Version: 13\r\n" +
              "Sec-WebSocket-Protocol: foo, bar, xmpp\r\n" +
              "\r\n"))
          driver().start()
        }})
      }})

      describe("with basic auth", function() { with(this) {
        define("url", function() { return "ws://user:pass@www.example.com/socket" })

        it("writes the handshake with Authorization", function() { with(this) {
          expect(driver().io, "emit").given("data", buffer(
              "GET /socket HTTP/1.1\r\n" +
              "Host: www.example.com\r\n" +
              "Upgrade: websocket\r\n" +
              "Connection: Upgrade\r\n" +
              "Sec-WebSocket-Key: 2vBVWg4Qyk3ZoM/5d3QD9Q==\r\n" +
              "Sec-WebSocket-Version: 13\r\n" +
              "Authorization: Basic dXNlcjpwYXNz\r\n" +
              "\r\n"))
          driver().start()
        }})
      }})

      describe("with custom headers", function() { with(this) {
        before(function() { with(this) {
          driver().setHeader("User-Agent", "Chrome")
        }})

        it("writes the handshake with custom headers", function() { with(this) {
          expect(driver().io, "emit").given("data", buffer(
              "GET /socket HTTP/1.1\r\n" +
              "Host: www.example.com\r\n" +
              "Upgrade: websocket\r\n" +
              "Connection: Upgrade\r\n" +
              "Sec-WebSocket-Key: 2vBVWg4Qyk3ZoM/5d3QD9Q==\r\n" +
              "Sec-WebSocket-Version: 13\r\n" +
              "User-Agent: Chrome\r\n" +
              "\r\n"))
          driver().start()
        }})
      }})

      it("changes the state to connecting", function() { with(this) {
        driver().start()
        assertEqual( "connecting", driver().getState() )
      }})
    }})
  }})

  describe("in the connecting state", function() { with(this) {
    before(function() { this.driver().start() })

    describe("with a valid response", function() { with(this) {
      before(function() { this.driver().parse(new Buffer(this.response())) })

      it("changes the state to open", function() { with(this) {
        assertEqual( true, open )
        assertEqual( false, close )
        assertEqual( "open", driver().getState() )
      }})

      it("makes the response status available", function() { with(this) {
        assertEqual( 101, driver().statusCode )
      }})

      it("makes the response headers available", function() { with(this) {
        assertEqual( "websocket", driver().headers.upgrade )
      }})
    }})

    describe("with a valid response followed by a frame", function() { with(this) {
      before(function() { with(this) {
        var resp = new Buffer(response().length + 4)
        new Buffer(response()).copy(resp)
        new Buffer([0x81, 0x02, 72, 105]).copy(resp, resp.length - 4)
        driver().parse(resp)
      }})

      it("changes the state to open", function() { with(this) {
        assertEqual( true, open )
        assertEqual( false, close )
        assertEqual( "open", driver().getState() )
      }})

      it("parses the frame", function() { with(this) {
        assertEqual( "Hi", message )
      }})
    }})

    describe("with a bad status line", function() { with(this) {
      before(function() {
        var resp = this.response().replace(/101/g, "4")
        this.driver().parse(new Buffer(resp))
      })

      it("changes the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( "Error during WebSocket handshake: Unexpected response code: 4", error.message )
        assertEqual( [1002, "Error during WebSocket handshake: Unexpected response code: 4"], close )
        assertEqual( "closed", driver().getState() )
      }})
    }})

    describe("with a bad Upgrade header", function() { with(this) {
      before(function() {
        var resp = this.response().replace(/websocket/g, "wrong")
        this.driver().parse(new Buffer(resp))
      })

      it("changes the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( "Error during WebSocket handshake: 'Upgrade' header value is not 'WebSocket'", error.message )
        assertEqual( [1002, "Error during WebSocket handshake: 'Upgrade' header value is not 'WebSocket'"], close )
        assertEqual( "closed", driver().getState() )
      }})
    }})

    describe("with a bad Accept header", function() { with(this) {
      before(function() {
        var resp = this.response().replace(/QV3/g, "wrong")
        this.driver().parse(new Buffer(resp))
      })

      it("changes the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( "Error during WebSocket handshake: Sec-WebSocket-Accept mismatch", error.message )
        assertEqual( [1002, "Error during WebSocket handshake: Sec-WebSocket-Accept mismatch"], close )
        assertEqual( "closed", driver().getState() )
      }})
    }})

    describe("with valid subprotocols", function() { with(this) {
      define("protocols", function() { return ["foo", "xmpp"] })

      before(function() {
        var resp = this.response().replace(/\r\n\r\n/, "\r\nSec-WebSocket-Protocol: xmpp\r\n\r\n")
        this.driver().parse(new Buffer(resp))
      })

      it("changs the state to open", function() { with(this) {
        assertEqual( true, open )
        assertEqual( false, close )
        assertEqual( "open", driver().getState() )
      }})

      it("selects the subprotocol", function() { with(this) {
        assertEqual( "xmpp", driver().protocol )
      }})
    }})

    describe("with invalid subprotocols", function() { with(this) {
      define("protocols", function() { return ["foo", "xmpp"] })

      before(function() {
        var resp = this.response().replace(/\r\n\r\n/, "\r\nSec-WebSocket-Protocol: irc\r\n\r\n")
        this.driver().parse(new Buffer(resp))
      })

      it("changs the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( "Error during WebSocket handshake: Sec-WebSocket-Protocol mismatch", error.message )
        assertEqual( [1002, "Error during WebSocket handshake: Sec-WebSocket-Protocol mismatch"], close )
        assertEqual( "closed", driver().getState() )
      }})

      it("selects no subprotocol", function() { with(this) {
        assertEqual( null, driver().protocol )
      }})
    }})
  }})
}})
