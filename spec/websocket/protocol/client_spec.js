var Client = require("../../../lib/websocket/protocol/client")

JS.Test.describe("Client", function() { with(this) {
    define("options", function() {
    return this._options = this._options || {protocols: this.protocols()}
  })

  define("protocols", function() {
    null
  })

  define("protocol", function() {
    if (this._protocol) return this._protocol
    this._protocol = new Client("ws://www.example.com/socket", this.options())
    var self = this
    this._protocol.on('open',    function(e) { self.open = true })
    this._protocol.on('message', function(e) { self.message += e.data })
    this._protocol.on('close',   function(e) { self.close = [e.code, e.reason] })
    var collector = this.collector()
    this._protocol.io.on("data", function(d) { collector.write(d) })
    return this._protocol
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
    this.open = this.close = false
    this.message = ""
  })

  describe("in the beginning state", function() { with(this) {
    it("starts in no state", function() { with(this) {
      assertEqual( null, protocol().getState() )
    }})

    describe("start", function() { with(this) {
      it("writes the handshake request to the socket", function() { with(this) {
        expect(protocol().io, "emit").given("data", buffer(
            "GET /socket HTTP/1.1\r\n" +
            "Host: www.example.com\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Key: 2vBVWg4Qyk3ZoM/5d3QD9Q==\r\n" +
            "Sec-WebSocket-Version: 13\r\n" +
            "\r\n"))
        protocol().start()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().start() )
      }})

      describe("with subprotocols", function() { with(this) {
        define("protocols", function() { return ["foo", "bar", "xmpp"] })

        it("writes the handshake with Sec-WebSocket-Protocol", function() { with(this) {
          expect(protocol().io, "emit").given("data", buffer(
              "GET /socket HTTP/1.1\r\n" +
              "Host: www.example.com\r\n" +
              "Upgrade: websocket\r\n" +
              "Connection: Upgrade\r\n" +
              "Sec-WebSocket-Key: 2vBVWg4Qyk3ZoM/5d3QD9Q==\r\n" +
              "Sec-WebSocket-Version: 13\r\n" +
              "Sec-WebSocket-Protocol: foo, bar, xmpp\r\n" +
              "\r\n"))
          protocol().start()
        }})
      }})

      it("changes the state to connecting", function() { with(this) {
        protocol().start()
        assertEqual( "connecting", protocol().getState() )
      }})
    }})
  }})

  describe("in the connecting state", function() { with(this) {
    before(function() { this.protocol().start() })

    describe("with a valid response", function() { with(this) {
      before(function() { this.protocol().parse(new Buffer(this.response())) })

      it("changes the state to open", function() { with(this) {
        assertEqual( true, open )
        assertEqual( false, close )
        assertEqual( "open", protocol().getState() )
      }})
    }})

    describe("with a valid response followed by a frame", function() { with(this) {
      before(function() { with(this) {
        var resp = new Buffer(response().length + 4)
        new Buffer(response()).copy(resp)
        new Buffer([0x81, 0x02, 72, 105]).copy(resp, resp.length - 4)
        protocol().parse(resp)
      }})

      it("changes the state to open", function() { with(this) {
        assertEqual( true, open )
        assertEqual( false, close )
        assertEqual( "open", protocol().getState() )
      }})

      it("parses the frame", function() { with(this) {
        assertEqual( "Hi", message )
      }})
    }})

    describe("with a bad Upgrade header", function() { with(this) {
      before(function() {
        var resp = this.response().replace(/websocket/g, "wrong")
        this.protocol().parse(new Buffer(resp))
      })

      it("changes the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( [1002, ""], close )
        assertEqual( "closed", protocol().getState() )
      }})
    }})

    describe("with a bad Accept header", function() { with(this) {
      before(function() {
        var resp = this.response().replace(/QV3/g, "wrong")
        this.protocol().parse(new Buffer(resp))
      })

      it("changes the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( [1002, ""], close )
        assertEqual( "closed", protocol().getState() )
      }})
    }})

    describe("with valid subprotocols", function() { with(this) {
      define("protocols", function() { return ["foo", "xmpp"] })

      before(function() {
        var resp = this.response().replace(/\r\n\r\n/, "\r\nSec-WebSocket-Protocol: xmpp\r\n\r\n")
        this.protocol().parse(new Buffer(resp))
      })

      it("changs the state to open", function() { with(this) {
        assertEqual( true, open )
        assertEqual( false, close )
        assertEqual( "open", protocol().getState() )
      }})

      it("selects the subprotocol", function() { with(this) {
        assertEqual( "xmpp", protocol().protocol )
      }})
    }})

    describe("with invalid subprotocols", function() { with(this) {
      define("protocols", function() { return ["foo", "xmpp"] })

      before(function() {
        var resp = this.response().replace(/\r\n\r\n/, "\r\nSec-WebSocket-Protocol: irc\r\n\r\n")
        this.protocol().parse(new Buffer(resp))
      })

      it("changs the state to closed", function() { with(this) {
        assertEqual( false, open )
        assertEqual( [1002, ""], close )
        assertEqual( "closed", protocol().getState() )
      }})

      it("selects no subprotocol", function() { with(this) {
        assertEqual( null, protocol().protocol )
      }})
    }})
  }})
}})

