'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var componentsManager = require('../utils/componentsManager');

/**
 * @class Esencia.Router
 * @extend Backbone.Router
 */

var Router = {
	componentsManager: componentsManager,
	namedParameters: true,
	autoloadModules: true,
	modulesPath: 'modules/',
	defaultModuleName: 'main',
	onModuleError: function() {}
};

var routerOptions = [
	'componentsManager', 'namedParameters',
	'autoloadModules', 'modulesPath', 'defaultModuleName', 'onModuleError'
];

/**
 * @constructor
 * @param {Object} [options]
 */

Router.constructor = function(options) {
	options = options || {};

	// populate Router instance with fields from options
	_.extend(this, _.pick(options, routerOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	this.modules = {};

	backbone.Router.apply(this, arguments);
};

/**
 * Add new component to components manager
 *
 * @param {Object} options - component options
 */

Router.component = function(options) {
	return this.componentsManager.add(options);
};

/**
 * Override `route` to add components processing functionality
 *
 * @override
 */

Router.route = function(route, options, callback) {
	var self = this;

	if (_.isFunction(options)) {
		callback = options;
		options = {};
	}

	if (!_.isObject(options)) {
		options = {name: options};
	}

	var name = '';

	if (_.has(options, 'components') || _.has(options, 'component')) {
		var components = _(options.components || [options.component])
			.map(function(componentOptions) {
				if (_.isString(componentOptions)) {
					return self.componentsManager.get(componentOptions);
				} else {
					return self.component(componentOptions);
				}
			});

		var componentNames = _.pluck(components, 'name');

		name = componentNames.join(',');

		// create callback to load components tree
		callback = function() {
			self.componentsManager.load(componentNames);
		};
	}

	name = options.name || name;

	// bind component to route
	backbone.Router.prototype.route.call(this, route, name, callback);
};

var namedParam = /(\(\?)?:\w+/g,
	splatParam = /\*\w+/g,
	namesPattern = /[\:\*]([^\:\?\/]+)/g;

Router._routeToRegExp = function(route) {
	var splatMatch = (splatParam.exec(route) || {index: -1}),
		namedMatch = (namedParam.exec(route) || {index: -1}),
		paramNames = route.match(namesPattern) || [];

	route = backbone.Router.prototype._routeToRegExp.call(this, route);

	// use the rtn value to hold some parameter data
	if (splatMatch.index >= 0) {
		// there is a splat
		if (namedMatch >= 0) {
			// negative value will indicate there is a splat match before any named matches
			route.splatMatch = splatMatch.index - namedMatch.index;
		} else {
			route.splatMatch = -1;
		}
	}

	// Map and remove any trailing ')' character that has been caught up in regex matching
	route.paramNames = _(paramNames).map(function(name) {
		return name.replace(/\)$/, '').substring(1);
	});

	return route;
};

Router._extractParameters = function(route, fragment) {
	var params = backbone.Router.prototype._extractParameters.call(
		this, route, fragment
	);
	var namedParams = {};

	// decode params
	var length = params.length;
	if (route.splatMatch) {
		if (route.splatMatch < 0) {
			// splat param is first
			return params;
		} else {
			length = length - 1;
		}
	}

	console.log('>>>>>>>>', length, route.paramNames)

	for (var i = 0; i < length; i++) {
		if (_.isString(params[i])) {
			if (route.paramNames && route.paramNames.length >= i - 1) {
				namedParams[route.paramNames[i]] = params[i];
			}
		}
	}

	console.log('>>>>>>>>', namedParams)

	return this.namedParameters ? [namedParams] : params;


	// return backbone.Router.prototype._extractParameters
	// 	.call(this, route, fragment);
};

/**
 * Load module file and init it
 *
 * @param {Object} fragment
 */

Router.loadModule = function(fragment) {
	var self = this;

	fragment = fragment || backbone.history.fragment;

	var moduleName = this.getModuleName(fragment);

	// require module file
	require([this.modulesPath + moduleName], function(moduleInit) {
		// if module is loaded first time
		if (!self.modules[moduleName]) {
			// init it
			moduleInit(self);

			// set module init flag to true
			self.modules[moduleName] = true;

			// and navigate again with force flag
			backbone.history.loadUrl(fragment);
		}
	}, this.onModuleError);
};

Router.getModuleName = function(fragment) {
	return _(fragment.split('/')).find(_.identity) || this.defaultModuleName;
};

module.exports = backbone.Router.extend(Router);
