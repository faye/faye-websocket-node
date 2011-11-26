var Client = require('../../../lib/faye/websocket/client')

JS.ENV.WebSocketSteps = JS.Test.asyncSteps({
  server: function(port, secure, callback) {
    this._adapter = new EchoServer()
    this._adapter.listen(port, secure)
    this._port = port
    setTimeout(callback, 100)
  },
  
  stop: function(callback) {
    this._adapter.stop()
    setTimeout(callback, 100)
  },
  
  open_socket: function(url, callback) {
    var done = false,
        self = this,
        
        resume = function(open) {
                   if (done) return
                   done = true
                   self._open = open
                   callback()
                 }
    
    this._ws = new Client(url)
    
    this._ws.onopen  = function() { resume(true)  }
    this._ws.onclose = function() { resume(false) }
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
  
  listen_for_message: function(callback) {
    var self = this
    this._ws.onmessage = function(message) { self._message = message.data }
    callback()
  },
  
  send_message: function(callback) {
    this._ws.send("I expect this to be echoed")
    setTimeout(callback, 100)
  },
  
  check_response: function(callback) {
    this.assertEqual( "I expect this to be echoed", this._message )
    callback()
  },
  
  check_no_response: function(callback) {
    this.assert( !this._message )
    callback()
  }
})


JS.ENV.ClientSpec = JS.Test.describe("Client", function() { with(this) {
  include(WebSocketSteps)
  
  before(function() {
    this.plain_text_url  = "ws://localhost:8000/bayeux"
    this.secure_url      = "wss://localhost:8000/bayeux"
  })
  
  sharedBehavior("socket client", function() { with(this) {
    it("can open a connection", function() { with(this) {
      open_socket(socket_url)
      check_open()
    }})
    
    it("cannot open a connection to the wrong host", function() { with(this) {
      open_socket(blocked_url)
      check_closed()
    }})
    
    it("can close the connection", function() { with(this) {
      open_socket(socket_url)
      close_socket()
      check_closed()
    }})
    
    describe("in the OPEN state", function() { with(this) {
      before(function() { with(this) {
        open_socket(socket_url)
      }})
      
      it("can send and receive messages", function() { with(this) {
        listen_for_message()
        send_message()
        check_response()
      }})
    }})
    
    describe("in the CLOSED state", function() { with(this) {
      before(function() { with(this) {
        open_socket(socket_url)
        close_socket()
      }})
      
      it("cannot send and receive messages", function() { with(this) {
        listen_for_message()
        send_message()
        check_no_response()
      }})
    }})
  }})
  
  describe("with a plain-text server", function() { with(this) {
    before(function() {
      this.socket_url  = this.plain_text_url
      this.blocked_url = this.secure_url
    })
    
    before(function() { this.server(8000, false) })
    after (function() { this.stop() })
    
    behavesLike("socket client")
  }})
  
  describe("with a secure server", function() { with(this) {
    before(function() {
      this.socket_url  = this.secure_url
      this.blocked_url = this.plain_text_url
    })
    
    before(function() { this.server(8000, true) })
    after (function() { this.stop() })
    
    behavesLike("socket client")
  }})
}})

