var Draft76 = require("../../../lib/websocket/protocol/draft76")

JS.Test.describe("Draft76", function() { with(this) {
  define("body", function() {
    return new Buffer([0x91, 0x25, 0x3e, 0xd3, 0xa9, 0xe7, 0x6a, 0x88])
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

  define("protocol", function() {
    if (this._protocol) return this._protocol
    this._protocol = new Draft76(this.request(), "ws://www.example.com/socket", this.options())
    var self = this
    this._protocol.onopen   (function(e) { self.open = true })
    this._protocol.onmessage(function(e) { self.message += e.data })
    this._protocol.onclose  (function(e) { self.close = true })
    this._protocol.io.pipe(this.collector())
    return this._protocol
  })

  before(function() {
    this.open = this.close = false
    this.message = ""
  })

  itShouldBehaveLike("draft-75 protocol")
}})

