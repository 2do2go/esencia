'use strict';

var backbone = require('backbone');

// There is no good exports of extend method from backbone.
// Take it from View because no other ways
module.exports = backbone.View.extend;
