'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var execUtils = require('../utils/exec');

/**
 * @class Esencia.Model
 * @extend Backbone.Model
 */

var Model = {};

/**
 * Override `sync` to add exec custom method functionality
 *
 * @override
 */

Model.sync = function(method, model, options) {
	if (!_.contains(execUtils.baseMethods, method)) {
		options = execUtils.prepareOptions(method, model, options);
		method = execUtils.getFakeBaseMethod(options);
	}

	return backbone.Model.prototype.sync.call(this, method, model, options);
};

/**
 * Exec custom non-REST method on model
 * It trigger `exec:[method]` event after success method exec
 *
 * @param {String} method
 * @param {Object} options
 */

Model.exec = function(method, options) {
	options = _.extend({parse: true}, options);
	var model = this;
	var success = options.success;
	options.success = function(resp) {
		if (options.fetch) {
			var serverAttrs = options.parse ? model.parse(resp, options) : resp;
			if (!model.set(serverAttrs, options)) return false;
		}
		if (success) success.call(options.context, model, resp, options);
		model.trigger('exec:' + method, model, resp, options);
	};
	execUtils.wrapError(this, options);
	return this.sync(method, this, options);
};

module.exports = backbone.Model.extend(Model);
