var Client = require('../../../lib/faye/websocket/client'),
    test   = require('jstest').Test,
    fs     = require('fs')

var WebSocketSteps = test.asyncSteps({
  server: function(port, secure, callback) {
    this._adapter = new EchoServer()
    this._adapter.listen(port, secure)
    this._port = port
    process.nextTick(callback)
  },

  stop: function(callback) {
    this._adapter.stop()
    process.nextTick(callback)
  },

  open_socket: function(url, protocols, callback) {
    var done = false,
        self = this,

        resume = function(open) {
                   if (done) return
                   done = true
                   self._open = open
                   callback()
                 }

    this._ws = new Client(url, protocols, {
      ca: fs.readFileSync(__dirname + '/../../server.crt')
    })

    this._ws.onopen  = function() { resume(true)  }
    this._ws.onclose = function() { resume(false) }
  },

  open_socket_and_close_it_fast: function(url, protocols, callback) {
    var self = this

    this._ws = new Client(url, protocols, {
      ca: fs.readFileSync(__dirname + '/../../server.crt')
    })

    this._ws.onopen  = function() { self._open = self._ever_opened = true  }
    this._ws.onclose = function() { self._open = false }

    this._ws.close()

    callback()
  },

  close_socket: function(callback) {
    var self = this
    this._ws.onclose = function() {
      self._open = false
      callback()
    }
    this._ws.close()
  },

  check_open: function(callback) {
    this.assert( this._open )
    callback()
  },

  check_closed: function(callback) {
    this.assert( !this._open )
    callback()
  },

  check_never_opened: function(callback) {
    this.assert( !this._ever_opened )
    callback()
  },

  check_readable: function(callback) {
    this.assert( this._ws.readable )
    callback()
  },

  check_not_readable: function(callback) {
    this.assert( ! this._ws.readable )
    callback()
  },

  check_protocol: function(protocol, callback) {
    this.assertEqual( protocol, this._ws.protocol )
    callback()
  },

  listen_for_message: function(callback) {
    var time = new Date().getTime(), self = this
    this._ws.addEventListener('message', function(message) { self._message = message.data })
    var timer = setInterval(function() {
      if (self._message || new Date().getTime() - time > 3000) {
        clearInterval(timer)
        callback()
      }
    }, 100)
  },

  send_message: function(message, callback) {
    var ws = this._ws
    setTimeout(function() { ws.send(message) }, 500)
    process.nextTick(callback)
  },

  check_response: function(message, callback) {
    this.assertEqual( message, this._message )
    callback()
  },

  check_no_response: function(callback) {
    this.assert( !this._message )
    callback()
  },

  wait: function (ms, callback) {
    setTimeout(callback, ms)
  }
})


test.describe("Client", function() { with(this) {
  include(WebSocketSteps)

  before(function() {
    this.protocols       = ["foo", "echo"]
    this.plain_text_url  = "ws://localhost:4180/bayeux"
    this.secure_url      = "wss://localhost:4180/bayeux"
    this.port            = 4180
  })

  sharedBehavior("socket client", function() { with(this) {
    it("can open a connection", function() { with(this) {
      open_socket(socket_url, protocols)
      check_open()
      check_protocol("echo")
    }})

    it("can close the connection", function() { with(this) {
      open_socket(socket_url, protocols)
      check_readable()
      close_socket()
      check_closed()
      check_not_readable()
    }})

    describe("in the OPEN state", function() { with(this) {
      before(function() { with(this) {
        open_socket(socket_url, protocols)
      }})

      it("can send and receive messages", function() { with(this) {
        send_message("I expect this to be echoed")
        listen_for_message()
        check_response("I expect this to be echoed")
      }})

      it("sends numbers as strings", function() { with(this) {
        send_message(13)
        listen_for_message()
        check_response("13")
      }})

      it("sends booleans as strings", function() { with(this) {
        send_message(false)
        listen_for_message()
        check_response("false")
      }})

      it("sends arrays as strings", function() { with(this) {
        send_message([13,14,15])
        listen_for_message()
        check_response("13,14,15")
      }})
    }})

    describe("in the CLOSED state", function() { with(this) {
      before(function() { with(this) {
        open_socket(socket_url, protocols)
        close_socket()
      }})

      it("cannot send and receive messages", function() { with(this) {
        send_message("I expect this to be echoed")
        listen_for_message()
        check_no_response()
      }})
    }})

    it("can be closed before connecting", function() { with(this) {
      open_socket_and_close_it_fast(socket_url, protocols)
      wait(10)
      check_closed()
      check_never_opened()
      check_not_readable()
    }})
  }})

  describe("with a plain-text server", function() { with(this) {
    before(function() {
      this.socket_url  = this.plain_text_url
      this.blocked_url = this.secure_url
    })

    before(function() { this.server(4180, false) })
    after (function() { this.stop() })

    behavesLike("socket client")
  }})

  describe("with a secure server", function() { with(this) {
    before(function() {
      this.socket_url  = this.secure_url
      this.blocked_url = this.plain_text_url
    })

    before(function() { this.server(4180, true) })
    after (function() { this.stop() })

    behavesLike("socket client")
  }})
}})
