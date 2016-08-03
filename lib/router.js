'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var View = require('./view');

/**
 * Router extends default backbone Router
 */

var Router = {
	root: '/',
	rootViewEl: 'html',
	modulesPath: 'modules/',
	defaultModuleName: 'main',
	pushState: false,
	namedParameters: false,
	autoloadModules: true,
	debug: false,
	config: {},
	onModuleError: function() {},
	nowhereUrl: '___'
};

var routerOptions = [
	'root', 'rootViewEl', 'modulesPath', 'defaultModuleName', 'pushState',
	'namedParameters', 'autoloadModules', 'debug', 'config', 'onModuleError',
	'nowhereUrl'
];

/*
 * Override `constructor`
 * @param {Object} [options]
 */

Router.constructor = function(options) {
	options = options || {};

	// populate Router instance with fields from options
	_.extend(this, _.pick(options, routerOptions));

	// save original options, it is sometimes usefull
	this.options = options;

	this.components = {};
	this.componentsTree = null;
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

Router._initRootComponent = function() {
	var RootView = View.extend({
		el: this.rootViewEl
	});

	this.component({
		name: '',
		parent: null,
		View: RootView
	});
};

Router._populateUrlParams = function(componentName, params) {
	var urlParams = this.urlParams;

	// clean old values from urlParams object
	var key;
	for (key in urlParams) {
		if (_(urlParams).has(key)) {
			delete urlParams[key];
		}
	}

	var component = this.components[componentName];

	// populate urlParams with new params
	return _(urlParams).extend(
		_(component).result('defaultUrlParams'),
		params
	);
};

/*
 * Add component to router and bind it to url
 *
 * @param {Object} component
 */

 var componentOptions = [
	'url', 'name', 'parent', 'container', 'View', 'models', 'collections',
	'viewOptions', 'defaultUrlParams'
];

Router.component = function(options) {
	var router = this;

	options = _({}).defaults(options, {
		parent: '',
		defaultUrlParams: {},
		viewOptions: {},
		process: false
	});

	var component = _(options).pick(componentOptions);

	// generate uniq component name if name is omitted
	if (_.isUndefined(component.name)) {
		component.name = _.uniqueId('auto-named-component');
	}

	if (!_.isString(component.name)) {
		throw new Error('Component `name` option should be a string');
	}

	if (component.name in this.components) {
		throw new Error('Duplicate component with name "' + component.name + '"');
	}

	if (!component.View) {
		throw new Error('Component `View` option is required');
	}

	if (!_.isString(component.parent) && !_.isNull(component.parent)) {
		throw new Error('Component `parent` option should be a string or null');
	}

	this.components[component.name] = component;

	// bind component to route
	if (!_.isUndefined(component.url)) {
		this.route(component.url, component.name, function(params) {
			router._populateUrlParams(component.name, params);

			// process components tree
			router._processComponent(component.name);
		});
	}

	// process components tree in force mode
	if (options.process) {
		this._processComponent(component.name);
	}

	return this;
};

Router._calculateComponentsTree = function(componentName, child) {
	var component = this.components[componentName];

	if (!component) {
		throw new Error('Unknown component with name "' + componentName + '"');
	}

	var node = {name: componentName};
	if (child) {
		node.child = child;
	}

	if (_.isString(component.parent)) {
		return this._calculateComponentsTree(component.parent, node);
	} else {
		return node;
	}
};

Router._isComponentTreeNodeChanged = function(oldNode, node) {
	if (!oldNode || oldNode.name !== node.name || !oldNode.view) return true;
	var component = this.components[node.name];
	if (oldNode.view instanceof component.View === false) return true;
	if (!oldNode.view.attached) return true;
	return !oldNode.view.isUnchanged();
};

Router._applyComponentsTree = function(params, callback) {
	var self = this;

	var parentNode = params.parentNode;

	var iterateNode = function(oldNode, node) {
		// omit child field in new node because it will set recursive
		// and should not exist if error case
		var childNode = node.child;
		delete node.child;

		if (parentNode) {
			parentNode.child = node;
		} else {
			self.componentsTree = node;
		}

		if (childNode) {
			self._applyComponentsTree({
				parentNode: node,
				oldNode: oldNode && oldNode.child || null,
				node: childNode
			}, callback);
		} else {
			callback();
		}
	};

	var node = params.node;
	var oldNode = params.oldNode;
	var component = this.components[node.name];

	var onViewResolve = function(view) {
		node.view = view;
		view.setData();

		if (component.container) {
			if (!parentNode) {
				throw new Error(
					'Parent component should exist for component with `container` option'
				);
			}

			parentNode.view
				.setView(view, component.container)
				.renderViews()
				.attachViews();
		} else {
			view.render();
		}

		// stop processing old components tree
		iterateNode(null, node);
	};

	// get view from old node
	var oldView = oldNode && oldNode.view;

	if (this._isComponentTreeNodeChanged(oldNode, node)) {
		if (oldView) {
			if (oldView.container) {
				// remove old view if container for new view dirrent
				if (!component.container || oldView.container !== component.container) {
					oldView.remove();
				}
			} else {
				// detach old view if it has not a container
				oldView.detach();
			}
		}

		// create new view
		var view = new (component.View)(
			_(component)
				.chain()
				.pick('models', 'collections')
				.defaults(_(component).result('viewOptions'))
				.extend({router: this})
				.value()
		);

		if (view.waiting) {
			// wait when view will be resolved
			view.once('resolve', function() {
				onViewResolve(view);
			});
		} else {
			onViewResolve(view);
		}
	} else {
		// get old child view if exists
		var oldChildView = oldNode.child && oldNode.child.view;

		// temporary remove child node view from container
		// to prevent recursive renderViews
		var oldChildViewContainer;
		if (oldChildView) {
			oldChildViewContainer = oldChildView.container;

			if (oldChildViewContainer) {
				oldView.removeView(oldChildView, oldChildViewContainer);
			}
		}

		// save old view to new node
		node.view = oldView;

		// set data and re-render old view
		oldView.setData();
		oldView.render();

		// revert child node view
		if (oldChildView && oldChildViewContainer) {
			oldView.setView(oldChildView, oldChildViewContainer);
		}

		// proprocessing old components tree
		iterateNode(oldNode, node);
	}
};

Router._processComponent = function(componentName, callback) {
	callback = callback || _.noop;

	var newComponentsTree = this._calculateComponentsTree(componentName);

	this._applyComponentsTree({
		parentNode: null,
		oldNode: this.componentsTree,
		node: newComponentsTree
	}, callback);
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
	this._initRootComponent();

	backbone.history.start({
		pushState: this.pushState,
		root: this.root
	});
};

module.exports = backbone.Router.extend(Router);
