'use strict';

var _ = require('underscore');
var backbone = require('backbone');

var Collection = {};

// base methods map
var baseMethods = ['create', 'update', 'patch', 'delete', 'read'];

var execMethodType = 'PUT';

/*
 * Override `sync` to add exec custom method functionality
 */

Collection.sync = function(method, model, options) {
	// if sync is called for custom exec method
	if (!_.contains(baseMethods, method)) {
		options = options || {};

		var params = {
			type: execMethodType,
			dataType: 'json',
			contentType: 'application/json',
			processData: false
		};

		// Ensure that we have a URL and add method name to it
		if (!options.url) {
			var url = _.result(model, 'url') || urlError();
			params.url = url + (url.charAt(url.length - 1) === '/' ? '' : '/') + method;
		}

		// stringify data to json
		if (options.data && _.isObject(options.data)) {
			options.data = JSON.stringify(options.data);
		}

		// Make the request, allowing the user to override any Ajax options.
		var xhr = options.xhr = backbone.ajax(_.extend(params, options));
		model.trigger('request', model, xhr, options);
		return xhr;
	} else {
		// call default backbone.Collection sync for base REST methods
		return backbone.Collection.prototype.sync.call(this, method, model, options);
	}
};

/*
 * Exec custom non-REST method on collection
 * It trigger `exec:[method]` event after success collection sync
 *
 * @param {String} method
 * @param {Object} options
 */

Collection.exec = function(method, options) {
	options = options ? _.clone(options) : {};

	var collection = this;
	var success = options.success;
	options.success = function(resp) {
		if (success) success(collection, resp, options);
		collection.trigger('exec:' + method, collection, resp, options);
	};

	var error = options.error;
	options.error = function(resp) {
		if (error) error(collection, resp, options);
		collection.trigger('error', collection, resp, options);
	};

	return this.sync(method, this, options);
};

// Throw an error when a URL is needed, and none is supplied.
var urlError = function() {
	throw new Error('A "url" property or function must be specified');
};

module.exports = backbone.Collection.extend(Collection);
