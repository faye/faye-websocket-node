var API = {
  CONNECTING:   0,
  OPEN:         1,
  CLOSING:      2,
  CLOSED:       3,
  
  onopen:     null,
  onmessage:  null,
  onerror:    null,
  onclose:    null,
  
  receive: function(data) {
    if (this.readyState !== API.OPEN) return false;
    var event = new API.Event('message');
    event.initEvent('message', false, false);
    event.data = data;
    this.dispatchEvent(event);
  },
  
  send: function(data, type, errorType) {
    if (this.readyState === API.CLOSED) return false;
    return this._parser.frame(data, type, errorType);
  },
  
  close: function(code, reason, ack) {
    if (this.readyState === API.CLOSING ||
        this.readyState === API.CLOSED) return;
    
    this.readyState = API.CLOSING;
    
    var close = function() {
      this.readyState = API.CLOSED;
      this._stream.end();
      var event = new API.Event('close', {code: code || 1000, reason: reason || ''});
      event.initEvent('close', false, false);
      this.dispatchEvent(event);
    };
    
    if (ack !== false) {
      if (this._parser.close) this._parser.close(code, reason, close, this);
      else close.call(this);
    } else {
      if (this._parser.close) this._parser.close(code, reason);
      close.call(this);
    }
  },
  
  addEventListener: function(type, listener, useCapture) {
    this._listeners = this._listeners || {};
    var list = this._listeners[eventType] = this._listeners[eventType] || [];
    list.push([listener, context]);
  },
  
  removeEventListener: function(type, listener, useCapture) {
    if (!this._listeners || !this._listeners[eventType]) return;
    
    if (!listener) {
      delete this._listeners[eventType];
      return;
    }
    var list = this._listeners[eventType],
        i    = list.length;
    
    while (i--) {
      if (listener !== list[i][0]) continue;
      if (context && list[i][1] !== context) continue;
      list.splice(i,1);
    }
  },
  
  dispatchEvent: function(event) {
    event.target = event.currentTarget = this;
    event.eventPhase = API.Event.AT_TARGET;
    
    if (this['on' + event.type])
      this['on' + event.type](event);
    
    var args = Array.prototype.slice.call(arguments),
        eventType = args.shift();
    
    if (!this._listeners || !this._listeners[eventType]) return;
    
    this._listeners[eventType].forEach(function(listener) {
      listener[0].apply(listener[1], args);
    });
  }
};


var Event = function(eventType, options) {
  this.type = eventType;
  for (var key in options)
    this[key] = options[key];
};
    
Event.prototype.initEvent = function(eventType, canBubble, cancelable) {
  this.type       = eventType;
  this.bubbles    = canBubble;
  this.cancelable = cancelable;
};

Event.prototype.stopPropagation = function() {};
Event.prototype.preventDefault  = function() {};
    
Event.CAPTURING_PHASE = 1;
Event.AT_TARGET       = 2;
Event.BUBBLING_PHASE  = 3;

API.Event = Event;

module.exports = API;

