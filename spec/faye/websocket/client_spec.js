var Client      = require('../../../lib/faye/websocket/client'),
    EchoServer  = require('../../echo_server'),
    ProxyServer = require('../../proxy_server'),
    test        = require('jstest').Test,
    fs          = require('fs')

var WebSocketSteps = test.asyncSteps({
  server: function(port, secure, callback) {
    this._echoServer = new EchoServer(secure)
    this._echoServer.listen(port)
    process.nextTick(callback)
  },

  stop: function(callback) {
    this._echoServer.stop()
    process.nextTick(callback)
  },

  proxy: function(port, secure, callback) {
    this._proxyServer = new ProxyServer({tls: secure})
    this._proxyServer.listen(port)
    process.nextTick(callback)
  },

  stop_proxy: function(callback) {
    this._proxyServer.stop()
    process.nextTick(callback)
  },

  open_socket: function(url, protocols, callback) {
    var done = false,
        self = this,

        tlsOptions = { ca: fs.readFileSync(__dirname + '/../../server.crt') },

        resume = function(open) {
                   if (done) return
                   done = true
                   self._open = open
                   callback()
                 }

    this._ws = new Client(url, protocols, {
      proxy: { origin: this.proxy_url, tls: tlsOptions },
      tls:   tlsOptions
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

  check_open: function(status, headers, callback) {
    this.assert( this._open )
    this.assertEqual( status, this._ws.statusCode )
    for (var name in headers)
      this.assertEqual( headers[name], this._ws.headers[name.toLowerCase()] )
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
    this.protocols             = ["foo", "echo"]

    this.plain_text_url        = "ws://localhost:4180/bayeux"
    this.secure_url            = "wss://localhost:4180/bayeux"
    this.port                  = 4180

    this.plain_text_proxy_url  = "http://localhost:4181"
    this.secure_text_proxy_url = "https://localhost:4181"
    this.proxy_port            = 4181
  })

  sharedBehavior("socket client", function() { with(this) {
    it("can open a connection", function() { with(this) {
      open_socket(socket_url, protocols)
      check_open(101, {"Upgrade": "websocket"})
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
      wait(100)
      check_closed()
      check_never_opened()
      check_not_readable()
    }})
  }})

  sharedBehavior("socket server", function() { with(this) {
    describe("with a plain-text server", function() { with(this) {
      before(function() {
        this.socket_url  = this.plain_text_url
        this.blocked_url = this.secure_url
      })

      before(function() { this.server(this.port, false) })
      after (function() { this.stop() })

      behavesLike("socket client")
    }})

    describe("with a secure server", function() { with(this) {
      before(function() {
        this.socket_url  = this.secure_url
        this.blocked_url = this.plain_text_url
      })

      before(function() { this.server(this.port, true) })
      after (function() { this.stop() })

      behavesLike("socket client")
    }})
  }})

  describe("with no proxy", function() { with(this) {
    behavesLike("socket server")
  }})

  describe("with a proxy", function() { with(this) {
    before(function() {
      this.proxy_url = this.plain_text_proxy_url
    })

    before(function() { this.proxy(this.proxy_port, false) })
    after (function() { this.stop_proxy() })

    behavesLike("socket server")
  }})

  describe("with a secure proxy", function() { with(this) {
    before(function() {
      this.proxy_url = this.secure_text_proxy_url
    })

    before(function() { this.proxy(this.proxy_port, true) })
    after (function() { this.stop_proxy() })

    behavesLike("socket server")
  }})
}})
