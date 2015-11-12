'use strict';

(function (root, factory) {
	function makeGlobal(Router) {
		root.esencia = root.esencia || {};
		root.esencia.Router = Router;
		return Router;
	}

	if (typeof exports === 'object' && root.require) {
		// CommonJS
		module.exports = factory(require('underscore'), require('backbone'));
		makeGlobal(module.exports);
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define(['underscore', 'backbone'], function(_, Backbone) {
			// Use global variables if the locals are undefined.
			var Router = factory(_ || root._, Backbone || root.Backbone);
			return makeGlobal(Router);
		});
	} else {
		// RequireJS isn't being used.
		// Assume underscore and backbone are loaded in <script> tags
		makeGlobal(factory(root._, root.Backbone));
	}
}(this, function(_, backbone) {
	/**
	 * Router extends default backbone Router
	 */

	var Router = {
		root: '/',
		modulesPath: 'modules/',
		defaultModuleName: 'main',
		pushState: false,
		namedParameters: false,
		autoloadModules: true,
		config: {},
		onModuleError: function() {},
		nowhereUrl: '___'
	};

	var routerOptions = ['root', 'modulesPath', 'defaultModuleName', 'pushState',
		'namedParameters', 'autoloadModules', 'debug', 'config', 'onModuleError'];
	/*
	 * Override `constructor`
	 * @param {Object} [options]
	 */

	Router.constructor = function(options) {
		options = options || {};
		this._configure(options);

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
	 * Configure router with options
	 */

	Router._configure = function(options) {
		if (this.options) options = _.extend({}, _.result(this, 'options'), options);
		_.extend(this, _.pick(options, routerOptions));
		this.options = options;
		this.controllersHash = {};
		this.urlParams = {};
		this.modules = {};
	};

	/*
	 * Add controller to router and bind it
	 *
	 * @param {Controller} controller
	 */

	Router.controller = function(controller, options) {
		var router = this;

		options = options || {};

		var name = controller.name || '';

		if (name) {
			if (name in this.controllersHash) {
				throw new Error('Duplicate controller with name `' + name + '`.');
			}

			this.controllersHash[name] = controller;
		}

		// add link to urlParams to controller
		controller.urlParams = this.urlParams;

		// bind controller to route
		if (!_.isUndefined(controller.url)) {
			this.route(controller.url, name, function(params) {
				// clean old values from urlParams object
				var urlParams = router.urlParams;
				for (var i in urlParams) {
					delete urlParams[i];
				}

				// populate urlParams with new params
				_(urlParams).extend(controller.defaultUrlParams, params);

				// process controllers chain
				router.processController(controller);
			});
		}

		// process controllers chain in force mode
		if (options.process) {
			this.processController(controller);
		}

		return this;
	};

	/*
	 * Add set of controllers to router and bind them
	 *
	 * @param {Controller[]} controllers
	 */

	Router.controllers = function(controllers) {
		if (!_.isArray(controllers)) {
			controllers = [controllers];
		}

		_(controllers).each(this.controller, this);

		return this;
	};

	/*
	 * Process parent controllers chain, set parent to
	 *  controller and process controller with stage after it
	 *
	 * @param {Controller} controller
	 * @param {String} [stage]
	 * @param {Function} callback
	 */

	Router.processController = function(controller, stage, callback) {
		stage = stage || 'render';

		var parentName = controller.parentName;

		if (parentName) {
			var parentStage = 'render';

			if (_.isObject(parentName)) {
				parentStage = _.toArray(parentName)[0];
				parentName = _.keys(parentName)[0];
			}

			// get parent controller
			var parent = controller.parent || this.controllersHash[parentName];
			if (!parent) {
				throw new Error(
					'Parent controller with name `' + parentName + '` is undefined.'
				);
			}

			if (parent.view && parent.view.isAttached()) parentStage = 'renderOnly';

			this.processController(parent, parentStage, function() {
				if (!controller.parent) {
					controller.parent = parent;
				}

				controller.process(stage, callback);
			});
		} else {
			controller.process(stage, callback);
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
		// TODO: block nowhere url via `execute` after upgrade backbone (1.1.1)
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

		if (qs) {
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
		backbone.history.start({
			pushState: this.pushState,
			root: this.root
		});
	};

	return backbone.Router.extend(Router);
}));
