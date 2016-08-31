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

Router._extractParameters = function(route, fragment) {
	return backbone.Router.prototype._extractParameters
		.call(this, route, fragment);
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
