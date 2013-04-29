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
    this._protocol.onopen   (function(e) { self.open = true })
    this._protocol.onmessage(function(e) { self.message += e.data })
    this._protocol.onclose  (function(e) { self.close = true })
    var collector = this.collector()
    this._protocol.io.on("data", function(d) { collector.write(d) })
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
  }})
}})

