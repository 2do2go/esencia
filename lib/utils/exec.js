'use strict';

var _ = require('underscore');

// Default http method type for exec methods
var DEFAULT_EXEC_TYPE = 'PUT';

// Throw an error when a URL is needed, and none is supplied.
var urlError = function() {
	throw new Error('A `url` property or function must be specified');
};

// Wrap an optional error callback with a fallback error event.
exports.wrapError = function(model, options) {
	var error = options.error;
	options.error = function(resp) {
		if (error) error.call(options.context, model, resp, options);
		model.trigger('error', model, resp, options);
	};
};

exports.prepareOptions = function(method, model, options) {
	options = _.extend({
		type: DEFAULT_EXEC_TYPE,
		dataType: 'json',
		contentType: 'application/json',
		processData: false
	}, options);

	// Ensure that we have a URL and add method name to it
	if (!options.url) {
		var url = _.result(model, 'url') || urlError();
		options.url = url.replace(/[^\/]$/, '$&/') + method;
	}

	// stringify data to json
	if (options.data && _.isObject(options.data) && !options.processData) {
		options.data = JSON.stringify(options.data);
	}

	return options;
};

// HTTP type to backbone sync methods map
var baseMethodsMap = {
	'POST': 'create',
	'PUT': 'update',
	'PATCH': 'patch',
	'DELETE': 'delete',
	'GET': 'read'
};

exports.baseMethods = _.values(baseMethodsMap);

exports.getFakeBaseMethod = function(options) {
	return baseMethodsMap[options.type.toUpperCase()];
};
