'use strict';

(function(factory) {
	// Establish the root object, `window` (`self`) in the browser,
	// or `global` on the server.
	// We use `self` instead of `window` for `WebWorker` support.
	var root = (typeof self === 'object' && self.self === self && self) ||
		(typeof global === 'object' && global.global === global && global);

	function makeGlobal(Collection) {
		root.esencia = root.esencia || {};
		root.esencia.Collection = Collection;
		return Collection;
	}

	if (typeof exports === 'object' && root.require) {
		// CommonJS
		module.exports = factory(require('underscore'), require('backbone'));
		makeGlobal(module.exports);
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define(['underscore', 'backbone'], function(_, Backbone) {
			// Use global variables if the locals are undefined.
			var Collection = factory(_ || root._, Backbone || root.Backbone);
			return makeGlobal(Collection);
		});
	} else {
		// RequireJS isn't being used.
		// Assume underscore and backbone are loaded in <script> tags
		makeGlobal(factory(root._, root.Backbone));
	}
}(function(_, backbone) {
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

	return backbone.Collection.extend(Collection);
}));
