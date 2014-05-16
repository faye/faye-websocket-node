var Draft75 = require("../../../lib/websocket/driver/draft75"),
    test    = require('jstest').Test

test.describe("Draft75", function() { with(this) {
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

  define("driver", function() {
    if (this._driver) return this._driver
    this._driver = new Draft75(this.request(), "ws://www.example.com/socket", this.options())
    var self = this
    this._driver.on('open',    function(e) { self.open = true })
    this._driver.on('message', function(e) { self.message += e.data })
    this._driver.on('close',   function(e) { self.close = true })
    this._driver.io.pipe(this.collector())
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
            "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "WebSocket-Origin: http://www.example.com\r\n" +
            "WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
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
        assertEqual( "hixie-75", driver().version )
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
            "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
            "Upgrade: WebSocket\r\n" +
            "Connection: Upgrade\r\n" +
            "WebSocket-Origin: http://www.example.com\r\n" +
            "WebSocket-Location: ws://www.example.com/socket\r\n" +
            "\r\n"))
        expect(driver().io, "emit").given("data", buffer([0x00, 0x48, 0x69, 0xff]))

        driver().frame("Hi")
        driver().start()
      }})
    }})
  }})

  itShouldBehaveLike("draft-75 protocol")
}})
