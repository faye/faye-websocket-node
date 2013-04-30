var Draft75 = require("../../../lib/websocket/protocol/draft75")

JS.Test.describe("Draft75", function() { with(this) {
  define("request", function() {
    return this._request = this._request || {
      headers: {
        "connection": "Upgrade",
        "upgrade":    "WebSocket",
        "origin":     "http://www.example.com"
      }
    }
  })

  define("options", function() {
    return this._options = this._options || {masking: false}
  })

  define("protocol", function() {
    if (this._protocol) return this._protocol
    this._protocol = new Draft75(this.request(), "ws://www.example.com/socket", this.options())
    var self = this
    this._protocol.on('open',    function(e) { self.open = true })
    this._protocol.on('message', function(e) { self.message += e.data })
    this._protocol.on('close',   function(e) { self.close = true })
    this._protocol.io.pipe(this.collector())
    return this._protocol
  })

  before(function() {
    this.open = this.close = false
    this.message = ""
  })

  describe("in the connecting state", function() { with(this) {
    it("starts in the connecting state", function() { with(this) {
      assertEqual( "connecting", protocol().getState() )
    }})

    describe("start", function() { with(this) {
      it("writes the handshake response to the socket", function() { with(this) {
        expect(protocol().io, "emit").given("data", buffer(
            "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "WebSocket-Origin: http://www.example.com\r\n" +
            "WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
        protocol().start()
      }})

      it("returns true", function() { with(this) {
        assertEqual( true, protocol().start() )
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
        assertEqual( "hixie-75", protocol().version )
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

      it("queues the frames until the handshake has been sent", function() { with(this) {
        expect(protocol().io, "emit").given("data", buffer(
            "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "WebSocket-Origin: http://www.example.com\r\n" +
            "WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
        expect(protocol().io, "emit").given("data", buffer([0x00, 0x48, 0x69, 0xff]))

        protocol().frame("Hi")
        protocol().start()
      }})
    }})
  }})

  itShouldBehaveLike("draft-75 protocol")
}})

