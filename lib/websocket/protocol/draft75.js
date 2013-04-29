var Base = require('./base'),
    util = require('util');

var Draft75 = function(request, url, options) {
  Base.apply(this, arguments);
};
util.inherits(Draft75, Base);

module.exports = Draft75;

