'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var ComponentsManager = require('./componentsManager');

/**
 * Router extends default backbone Router
 */

var Router = {
	root: '/',
	pushState: false,
	namedParameters: false,
	nowhereUrl: '___',
	config: {},
	autoloadModules: true,
	modulesPath: 'modules/',
	defaultModuleName: 'main',
	onModuleError: function() {}
};

var routerOptions = [
	'root', 'pushState', 'namedParameters', 'nowhereUrl', 'config',
	'autoloadModules', 'modulesPath', 'defaultModuleName', 'onModuleError'
];

/*
 * Override `constructor`
 *
 * @param {Object} [options]
 */

Router.constructor = function(options) {
	options = options || {};

	// populate Router instance with fields from options
	_.extend(this, _.pick(options, routerOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	this.componentsManager = new ComponentsManager(
		_.extend({}, options, {viewOptions: {router: this}})
	);

	this.urlParams = {};
	this.modules = {};

	this.history = backbone.history;

	/*
	 * All query parameters can be passed in a single hash using the key
	 * referenced from the route definition (backbone queryparams will
	 * do it for us)
	 */

	backbone.Router.namedParameters = this.namedParameters;

	backbone.Router.apply(this, arguments);

	if (options.autoloadModules) {
		this.route('*url', function(params) {
			this.setModule(params);
		});
	}
};

/*
 * Extend all arguments to single object and replace urlParams with it
 *
 * @param {Object|Function} params1
 * @param {Object|Function} params2
 * etc. ...
 */

Router._populateUrlParams = function(/* params1, params2, ... */) {
	var self = this;

	// clean old values from urlParams object
	var key;
	for (key in this.urlParams) {
		if (_(this.urlParams).has(key)) {
			delete this.urlParams[key];
		}
	}

	// populate urlParams with new params
	_(arguments)
		.chain()
		.filter(_.isObject)
		.each(function(params) {
			params = _.isFunction(params) ? params.call(self) : params;
			_.extendOwn(self.urlParams, params);
		});

	return this.urlParams;
};

/*
 * Add new component to components manager
 *
 * @param {Object} options - component options
 */

Router.component = function(options) {
	var self = this;

	var component = this.componentsManager.add(options);

	// bind component to route
	if (!_.isUndefined(options.url)) {
		this.route(options.url, component.name, function(params) {
			self._populateUrlParams(options.defaultUrlParams, params);

			// process components tree
			self.componentsManager.process(component.name);
		});
	}
};

/*
 * Override `route` to add middleware processing functionality
 */

Router.route = function(url, name, callback) {
	var router = this;

	if (_.isFunction(name)) {
		callback = name;
		name = '';
	}

	backbone.Router.prototype.route.call(this, url, name, function() {
		var args = arguments;

		router._defaultMiddleware({
			url: url,
			name: name,
			callback: callback
		}, function() {
			callback.apply(router, args);
		});
	});
};

/*
 * Override `navigate`
 *
 * @param {String} fragment
 * @param {Object} [options] - hash of params
 * @param {Object} [options.qs] - query string hash
 */

Router.navigate = function(fragment, options) {
	options = options || {};

	if (fragment.indexOf(this.root) === 0) {
		fragment = fragment.substring(this.root.length);
	}

	// force to go to the selected fragment even if we currently on it
	if (options.force) {
		this.navigate(this.nowhereUrl, {
			replace: options.replace,
			trigger: false
		});

		options = _(options).chain().omit('force').extend({replace: true}).value();

		return this.navigate(fragment, options);
	}

	// set `trigger` to true by default
	options = _(options || {}).defaults({
		trigger: true,
		params: {}
	});

	// add support of query string using `toFragment` from backbone.queryparams
	var qs = options.qs;

	if (this.toFragment && qs) {
		// reject undefined and null qs parameters
		_(qs).each(function(val, key, qs) {
			if (val === undefined || val === null) delete qs[key];
		});

		fragment = this.toFragment(fragment, qs);

		delete options.qs;
	}

	backbone.Router.prototype.navigate.call(this, fragment, options);
};


/*
 * Default middleware function
 */

Router._defaultMiddleware = function(route, next) {
	next();
};

/**
 * Use passed function as `middleware`
 *
 * @param {Function} middleware - middleware function,
 * `route` and `next` will be passed as arguments.
 * context (`this`) is link to the router object.
 */

Router.middleware = function(middleware) {
	var router = this;

	var defaultMiddleware = this._defaultMiddleware;

	this._defaultMiddleware = function(route, next) {
		defaultMiddleware.call(router, route, function() {
			middleware.call(router, route, next);
		});
	};

	return this;
};

/*
 * Require module file and init it
 *
 * @param {String} params.url Url without query string
 */

Router.setModule = function(params) {
	var router = this;

	var url = params.url;
	delete params.url;

	var moduleName = _(url.split('/')).find(_.identity) || this.defaultModuleName;

	// require module file
	require([this.modulesPath + moduleName], function(moduleInit) {
		// if module is loaded first time
		if (!router.modules[moduleName]) {
			// init it
			moduleInit(router);

			// set module init flag to true
			router.modules[moduleName] = true;

			// and navigate again with force flag
			router.navigate(url, {
				replace: true,
				force: true,
				qs: params
			});
		}
	}, this.onModuleError);
};

/*
 * Start routes handling
 */

Router.start = function() {
	this.componentsManager.addRootComponent();

	backbone.history.start({
		pushState: this.pushState,
		root: this.root
	});
};

module.exports = backbone.Router.extend(Router);
