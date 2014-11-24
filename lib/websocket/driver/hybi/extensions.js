'use strict';

var TOKEN    = /([!#\$%&'\*\+\-\.\^_`\|~0-9a-z]+)/,
    NOTOKEN  = /([^!#\$%&'\*\+\-\.\^_`\|~0-9a-z])/g,
    QUOTED   = /"((?:\\[\x00-\x7f]|[^\x00-\x08\x0a-\x1f\x7f"])*)"/,
    PARAM    = new RegExp(TOKEN.source + '(?:=(?:' + TOKEN.source + '|' + QUOTED.source + '))?'),
    EXT      = new RegExp(TOKEN.source + '(?: *; *' + PARAM.source + ')*', 'g'),
    EXT_LIST = new RegExp('^' + EXT.source + '(?: *, *' + EXT.source + ')*$'),
    NUMBER   = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

var Extensions = function(driver) {
  this._driver   = driver;
  this._byName   = {};
  this._inOrder  = [];
  this._sessions = [];

  this._rsv1 = this._rsv2 = this._rsv3 = false;
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

  generateOffer: function() {
    var sessions = [],
        offer    = [],
        index    = {};

    this._inOrder.forEach(function(ext) {
      var session = ext.createClientSession(this);
      if (!session) return;

      sessions.push(session);
      index[ext.name] = {ext: ext, session: session};

      var offers = session.generateOffers();
      offers = offers ? [].concat(offers) : [];

      offers.forEach(function(off) {
        offer.push(this._serializeParams(ext.name, off));
      }, this);
    }, this);

    this._sessions = sessions;
    this._index    = index;

    return offer.length > 0 ? offer.join(', ') : null;
  },

  activate: function(header) {
    var responses = this._parseHeader(header),
        active    = [];

    responses.forEach(function(response) {
      var record  = this._index[response.name],
          ext     = record.ext,
          session = record.session;

      if (this._reserved(ext)) return;
      this._reserve(ext);

      session.activate(response.params);
      active.push(session);
    }, this);

    this._sessions = this._sessions.filter(function(session) {
      return active.indexOf(session) >= 0;
    });
  },

  generateResponse: function(header) {
    var offers   = this._parseHeader(header),
        sessions = [],
        response = [];

    offers.forEach(function(offer) {
      var ext = this._byName[offer.name];
      if (!ext || this._reserved(ext)) return;

      var session = ext && ext.createServerSession(this, offer.params);
      if (!session) return;

      this._reserve(ext);
      sessions.push(session);
      response.push(this._serializeParams(offer.name, session.generateResponse()));
    }, this);

    this._sessions = sessions;
    return response.length > 0 ? response.join(', ') : null;
  },

  processIncomingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(msg) {
      var session = sessions.pop();
      if (!session) return callback.call(context, msg);
      session.processIncomingMessage(msg, pipe);
    };
    pipe(message);
  },

  processOutgoingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(msg) {
      var session = sessions.shift();
      if (!session) return callback.call(context, msg);
      session.processOutgoingMessage(msg, pipe);
    };
    pipe(message);
  },

  rsvAcceptable: function(frame) {
    return (this._rsv1 || !frame.rsv1) && (this._rsv2 || !frame.rsv2) && (this._rsv3 || !frame.rsv3);
  },

  fail: function(type, message) {
    this._driver._fail(type, message);
  },

  _reserve: function(ext) {
    this._rsv1 = this._rsv1 || ext.rsv1;
    this._rsv2 = this._rsv2 || ext.rsv2;
    this._rsv3 = this._rsv3 || ext.rsv3;
  },

  _reserved: function(ext) {
    return (this._rsv1 && ext.rsv1) || (this._rsv2 && ext.rsv2) || (this._rsv3 && ext.rsv3);
  },

  _parseHeader: function(header) {
    if (header === undefined) return [];

    if (!EXT_LIST.test(header))
      throw new Error('Not a valid Sec-WebSocket-Extensions header: ' + header);

    var values = header.match(EXT),
        offers = [];

    values.forEach(function(value) {
      var params = value.match(new RegExp(PARAM.source, 'g')),
          name   = params.shift(),
          offer  = {name: name, params: {}};

      params.forEach(function(param) {
        var args = param.match(PARAM),
            key  = args[1],
            data;

        if (args[2] !== undefined) {
          data = args[2];
        } else if (args[3] !== undefined) {
          data = args[3].replace(/\\/g, '');
        } else {
          data = true;
        }
        if (NUMBER.test(data)) data = parseFloat(data);

        if (offer.params.hasOwnProperty(key)) {
          offer.params[key] = [].concat(offer.params[key]);
          offer.params[key].push(data);
        } else {
          offer.params[key] = data;
        }
      });
      offers.push(offer);
    });

    return offers;
  },

  _serializeParams: function(name, params) {
    var values = [];

    var print = function(key, value) {
      if (value instanceof Array) {
        value.forEach(function(v) { print(key, v) });
      } else if (value === true) {
        values.push(key);
      } else if (typeof value === 'number') {
        values.push(key + '=' + value);
      } else if (TOKEN.test(value)) {
        values.push(key + '=' + value);
      } else {
        values.push(key + '="' + value.replace(NOTOKEN, '\\$1') + '"');
      }
    };

    for (var key in params) print(key, params[key]);

    return [name].concat(values).join('; ');
  }
};

for (var key in instance)
  Extensions.prototype[key] = instance[key];

module.exports = Extensions;
