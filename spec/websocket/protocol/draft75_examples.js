JS.Test.describe("draft-75", function() { with(this) {
  sharedExamplesFor("draft-75 protocol", function() { with(this) {
    describe("in the open state", function() { with(this) {
      before(function() { this.protocol().start() })

      describe("parse", function() { with(this) {
        it("parses text frames", function() { with(this) {
          protocol().parse([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        it("parses multiple frames from the same packet", function() { with(this) {
          protocol().parse([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "HelloHello", message )
        }})

        it("parses text frames beginning 0x00-0x7F", function() { with(this) {
          protocol().parse([0x66, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        it("ignores frames with a length header", function() { with(this) {
          protocol().parse([0x80, 0x02, 0x48, 0x65, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        it("parses multibyte text frames", function() { with(this) {
          protocol().parse([0x00, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf, 0xff])
          assertEqual( "Apple = ", message )
        }})

        it("parses frames received in several packets", function() { with(this) {
          protocol().parse([0x00, 0x41, 0x70, 0x70, 0x6c, 0x65])
          protocol().parse([0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf, 0xff])
          assertEqual( "Apple = ", message )
        }})

        it("parses fragmented frames", function() { with(this) {
          protocol().parse([0x00, 0x48, 0x65, 0x6c])
          protocol().parse([0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})
      }})

      describe("frame", function() { with(this) {
        it("formats the given string as a WebSocket frame", function() { with(this) {
          protocol().frame("Hello")
          assertEqual( [0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff], collector().bytes )
        }})

        it("encodes multibyte characters correctly", function() { with(this) {
          protocol().frame("Apple = ")
          assertEqual( [0x00, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf, 0xff], collector().bytes )
        }})

        it("returns true", function() { with(this) {
          assertEqual( true, protocol().frame("lol") )
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
        it("triggers the onclose event", function() { with(this) {
          protocol().close()
          assertEqual( true, close )
        }})

        it("returns true", function() { with(this) {
          assertEqual( true, protocol().close() )
        }})

        it("changes the state to closed", function() { with(this) {
          protocol().close()
          assertEqual( "closed", protocol().getState() )
        }})
      }})
    }})

    describe("in the closed state", function() { with(this) {
      before(function() {
        this.protocol().start()
        this.protocol().close()
      })

      describe("close", function() { with(this) {
        it("does not write to the socket", function() { with(this) {
          expect(protocol().io, "emit").exactly(0)
          protocol().close()
        }})

        it("returns false", function() { with(this) {
          assertEqual( false, protocol().close() )
        }})

        it("leaves the protocol in the closed state", function() { with(this) {
          protocol().close()
          assertEqual( "closed", protocol().getState() )
        }})
      }})
    }})
  }})
}})

