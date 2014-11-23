var TOKEN    = /([!#\$%&'\*\+\-\.\^_`\|~0-9a-z]+)/,
    NOTOKEN  = /([^!#\$%&'\*\+\-\.\^_`\|~0-9a-z])/g,
    QUOTED   = /("(?:\\[\x00-\x7f]|[^\x00-\x08\x0a-\x1f\x7f"])*")/,
    PARAM    = new RegExp(TOKEN.source + '(?:=(?:' + TOKEN.source + '|' + QUOTED.source + '))?'),
    EXT      = new RegExp(TOKEN.source + '(?: *; *' + PARAM.source + ')*', 'g'),
    EXT_LIST = new RegExp('^' + EXT.source + '(?: *, *' + EXT.source + ')*$'),
    NUMBER   = /^-?(0|[1-9][0-9]*)(\.[0-9]+)$/;

var Extensions = function(driver) {
  this._driver   = driver;
  this._byName   = {};
  this._inOrder  = [];
  this._sessions = [];
};

var instance = {
  add: function(extension) {
    if (typeof extension.name !== 'string') throw new Error('extension.name must be a string');

    if (typeof extension.rsv1 !== 'boolean') throw new Error('extension.rsv1 must be true or false');
    if (typeof extension.rsv2 !== 'boolean') throw new Error('extension.rsv2 must be true or false');
    if (typeof extension.rsv3 !== 'boolean') throw new Error('extension.rsv3 must be true or false');

    if (this._byName.hasOwnProperty(extension.name))
      throw new Error('An extension with name "' + extension.name + '" is already registered');

    this._byName[extension.name] = extension;
    this._inOrder.push(extension);
  },

  activate: function(header) {
    if (header === undefined) return;

    var offers   = this._parseHeader(header),
        sessions = [],
        response = [];

    this._rsv1 = this._rsv2 = this_rsv3 = false;

    offers.forEach(function(offer) {
      var ext = this._byName[offer.name];
      if (!ext || (this._rsv1 && ext.rsv1) || (this._rsv2 && ext.rsv2) || (this._rsv3 && ext.rsv3)) return;

      var session = ext && ext.createServerSession(this, offer.params);
      if (!session) return;

      this._rsv1 = this._rsv1 || ext.rsv1;
      this._rsv2 = this._rsv2 || ext.rsv2;
      this._rsv3 = this._rsv3 || ext.rsv3;

      sessions.push(session);
      response.push(this._serializeParams(offer.name, session.getResponseParams()));
    }, this);

    this._sessions = sessions;
    return response.length > 0 ? response.join(', ') : null;
  },

  processIncomingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(msg) {
      var session = sessions.shift();
      if (!session) return callback.call(context, msg);
      session.processIncomingMessage(msg, pipe);
    };
    pipe(message);
  },

  rsvAcceptable: function(frame) {
    return (this._rsv1 || !frame.rsv1) && (this._rsv2 || !frame.rsv2) && (this._rsv3 || !frame.rsv3);
  },

  fail: function(type, message) {
    this._driver._fail(type, message);
  },

  _parseHeader: function(header) {
    if (!EXT_LIST.test(header))
      throw new Error('Not a valid Sec-WebSocket-Extensions header: ' + header);

    var values = header.match(EXT),
        offers = [];

    values.forEach(function(value) {
      var params = value.match(new RegExp(PARAM.source, 'g')),
          name   = params.shift(),
          offer    = {name: name, params: {}};

      params.forEach(function(param) {
        var args = param.match(PARAM), data;
        if (args[2] !== undefined) {
          data = args[2];
        } else if (args[3] !== undefined) {
          data = args[3].substring(1, args[3].length - 1).replace(/\\/g, '');
        } else {
          data = true;
        }
        if (NUMBER.test(data)) data = parseFloat(data);
        offer.params[args[1]] = data;
      });
      offers.push(offer);
    });

    return offers;
  },

  _serializeParams: function(name, params) {
    var values = [], value;

    for (var key in params) {
      value = params[key];
      if (value === true) {
        values.push(key);
      } else if (typeof value === 'number') {
        values.push(key + '=' + value);
      } else if (TOKEN.test(value)) {
        values.push(key + '=' + value);
      } else {
        values.push(key + '="' + value.replace(NOTOKEN, '\\$1') + '"');
      }
    }

    return [name].concat(values).join('; ');
  }
};

for (var key in instance)
  Extensions.prototype[key] = instance[key];

module.exports = Extensions;
