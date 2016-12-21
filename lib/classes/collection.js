'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var execUtils = require('../utils/exec');

/**
 * @class Esencia.Collection
 * @extend Backbone.Collection
 */

var Collection = {};

/**
 * Override `sync` to add exec custom method functionality
 *
 * @override
 */

Collection.sync = function(method, collection, options) {
	if (!_.contains(execUtils.baseMethods, method)) {
		options = execUtils.prepareOptions(method, collection, options);
		method = execUtils.getFakeBaseMethod(options);
	}

	return backbone.Collection.prototype.sync.call(
		this, method, collection, options
	);
};

/**
 * Exec custom non-REST method on collection
 * It trigger `exec:[method]` event after success method exec
 *
 * @param {String} method
 * @param {Object} options
 */

Collection.exec = function(method, options) {
	options = _.extend({parse: true}, options);
	var collection = this;
	var success = options.success;
	options.success = function(resp) {
		if (options.fetch) collection[options.reset ? 'reset' : 'set'](resp, options);
		if (success) success.call(options.context, collection, resp, options);
		collection.trigger('exec:' + method, collection, resp, options);
	};
	execUtils.wrapError(this, options);
	return this.sync(method, this, options);
};

module.exports = backbone.Collection.extend(Collection);
