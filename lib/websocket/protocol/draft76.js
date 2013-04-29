var Draft75 = require('./draft75'),
    util    = require('util');

var Draft76 = function(request, url, options) {
  Draft75.apply(this, arguments);
};
util.inherits(Draft76, Draft75);

module.exports = Draft76;

