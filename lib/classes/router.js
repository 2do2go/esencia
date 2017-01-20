'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var componentsManager = require('../utils/componentsManager');

var namesPattern = /[\:\*]([^\:\?\/]+)/g;

/**
 * @class Esencia.Router
 * @extend Backbone.Router
 */

var Router = {
	componentsManager: componentsManager,
	namedParameters: true,
	autoloadModules: false,
	modulesPath: 'modules/',
	defaultModuleName: 'main',
	require: window.require,
	onModuleError: function() {}
};

var routerOptions = [
	'componentsManager', 'namedParameters', 'autoloadModules', 'modulesPath',
	'defaultModuleName', 'require', 'onModuleError'
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

	if (this.autoloadModules) {
		this.route('*url', function(params) {
			this.loadModule();
		});
	}
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
			var viewOptions = {
				data: {
					fragment: backbone.history.fragment,
					params: self.namedParameters ? _.first(arguments) : _.initial(arguments),
					query: _.last(arguments)
				}
			};

			self.componentsManager.load(componentNames, {viewOptions: viewOptions});
		};
	}

	name = options.name || name;

	// bind component to route
	backbone.Router.prototype.route.call(this, route, name, callback);
};

Router._routeToRegExp = function(route) {
	var paramNames = route.match(namesPattern) || [];

	route = backbone.Router.prototype._routeToRegExp.call(this, route);

	// Map and remove any trailing ')' character that has been
	// caught up in regex matching
	route.paramNames = _(paramNames).map(function(name) {
		return name.replace(/\)$/, '').substring(1);
	});

	return route;
};

Router._extractParameters = function(route, fragment) {
	var params = backbone.Router.prototype._extractParameters.call(
		this, route, fragment
	);

	if (!this.namedParameters || !route.paramNames) return params;

	var namedParams = {};

	var paramsLength = params.length;
	_(route.paramNames).find(function(name, index) {
		if (_.isString(params[index]) && index < paramsLength - 1) {
			namedParams[name] = params[index];
			return false;
		} else {
			return true;
		}
	});

	var query = params[paramsLength - 1];

	return [namedParams, query];
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

	// if module is loaded first time
	if (!this.modules[moduleName]) {
		// require module file
		this.require([this.modulesPath + moduleName], function() {
			// set module init flag to true
			self.modules[moduleName] = true;

			// and navigate again with force flag
			backbone.history.loadUrl(fragment);
		}, this.onModuleError);
	}
};

Router.getModuleName = function(fragment) {
	return _(fragment.split(/(\/|\?)/)).find(_.identity) || this.defaultModuleName;
};

module.exports = backbone.Router.extend(Router);
