var test = require('jstest').Test

test.describe("draft-75", function() { with(this) {
  sharedExamplesFor("draft-75 protocol", function() { with(this) {
    describe("in the open state", function() { with(this) {
      before(function() { this.driver().start() })

      describe("parse", function() { with(this) {
        it("parses text frames", function() { with(this) {
          driver().parse([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        it("parses multiple frames from the same packet", function() { with(this) {
          driver().parse([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "HelloHello", message )
        }})

        it("parses text frames beginning 0x00-0x7F", function() { with(this) {
          driver().parse([0x66, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        it("ignores frames with a length header", function() { with(this) {
          driver().parse([0x80, 0x02, 0x48, 0x65, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        it("parses multibyte text frames", function() { with(this) {
          driver().parse([0x00, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf, 0xff])
          assertEqual( "Apple = ", message )
        }})

        it("parses frames received in several packets", function() { with(this) {
          driver().parse([0x00, 0x41, 0x70, 0x70, 0x6c, 0x65])
          driver().parse([0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf, 0xff])
          assertEqual( "Apple = ", message )
        }})

        it("parses fragmented frames", function() { with(this) {
          driver().parse([0x00, 0x48, 0x65, 0x6c])
          driver().parse([0x6c, 0x6f, 0xff])
          assertEqual( "Hello", message )
        }})

        describe("when a message listener throws an error", function() { with(this) {
          before(function() { with(this) {
            this.messages = []

            driver().on("message", function(msg) {
              messages.push(msg.data)
              throw new Error("an error")
            })
          }})

          it("is not trapped by the parser", function() { with(this) {
            var buffer = [0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff]
            assertThrows(Error, function() { driver().parse(buffer) })
          }})

          it("parses text frames without dropping input", function() { with(this) {
            try { driver().parse([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff, 0x00, 0x57]) } catch (e) {}
            try { driver().parse([0x6f, 0x72, 0x6c, 0x64, 0xff]) } catch (e) {}
            assertEqual( ["Hello", "World"], messages )
          }})
        }})
      }})

      describe("frame", function() { with(this) {
        it("formats the given string as a WebSocket frame", function() { with(this) {
          driver().frame("Hello")
          assertEqual( [0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff], collector().bytes )
        }})

        it("encodes multibyte characters correctly", function() { with(this) {
          driver().frame("Apple = ")
          assertEqual( [0x00, 0x41, 0x70, 0x70, 0x6c, 0x65, 0x20, 0x3d, 0x20, 0xef, 0xa3, 0xbf, 0xff], collector().bytes )
        }})

        it("converts numbers to strings", function() { with(this) {
          driver().frame(50)
          assertEqual( [0x00, 0x35, 0x30, 0xff], collector().bytes )
        }})

        it("returns true", function() { with(this) {
          assertEqual( true, driver().frame("lol") )
        }})
      }})

      describe("ping", function() { with(this) {
        it("does not write to the socket", function() { with(this) {
          expect(driver().io, "emit").exactly(0)
          driver().ping()
        }})

        it("returns false", function() { with(this) {
          assertEqual( false, driver().ping() )
        }})
      }})

      describe("close", function() { with(this) {
        it("triggers the onclose event", function() { with(this) {
          driver().close()
          assertEqual( true, close )
        }})

        it("returns true", function() { with(this) {
          assertEqual( true, driver().close() )
        }})

        it("changes the state to closed", function() { with(this) {
          driver().close()
          assertEqual( "closed", driver().getState() )
        }})
      }})
    }})

    describe("in the closed state", function() { with(this) {
      before(function() {
        this.driver().start()
        this.driver().close()
      })

      describe("close", function() { with(this) {
        it("does not write to the socket", function() { with(this) {
          expect(driver().io, "emit").exactly(0)
          driver().close()
        }})

        it("returns false", function() { with(this) {
          assertEqual( false, driver().close() )
        }})

        it("leaves the protocol in the closed state", function() { with(this) {
          driver().close()
          assertEqual( "closed", driver().getState() )
        }})
      }})
    }})
  }})
}})
