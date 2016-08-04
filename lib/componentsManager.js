'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var View = require('./view');

var ComponentsManager = function(options) {
	// populate ComponentsManager instance with fields from options
	_.extend(this, _.pick(options, componentManagerOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	// all components hash
	this.components = {};

	// current components tree that rendered at this moment
	this.componentsTree = null;

	this.initialize.apply(this, arguments);
};

var componentManagerOptions = ['rootComponentEl', 'viewOptions'];

 var componentOptions = [
	'name', 'parent', 'container', 'View', 'models', 'collections', 'viewOptions'
];

_.extend(ComponentsManager.prototype, backbone.Events, {
	rootComponentEl: 'html',

	/*
	 * Initialize is an empty function by default. Override it with your own
	 * initialization logic.
	 */

	initialize: function() {},

	/*
	 * Add root component to components list
	 */

	addRootComponent: function() {
		var RootView = View.extend({
			el: this.rootComponentEl
		});

		this.add({
			name: '',
			parent: null,
			View: RootView
		});
	},

	/*
	 * Add component to components list
	 *
	 * @param {Object} options - component options
	 */

	add: function(options) {
		options = _({}).defaults(options, {
			parent: '',
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

		// process components tree in force mode
		if (options.process) {
			this.process(component.name);
		}

		return component;
	},

	/*
	 * Get component by name
	 *
	 * @param {String} name - component name
	 */

	get: function(name) {
		return this.components[name] || null;
	},

	/*
	 * Remove component by name
	 *
	 * @param {String} name - component name
	 */

	remove: function(name) {
		delete this.components[name];
	},

	/*
	 * Process components tree and call a callback on done
	 *
	 * @param {String} name - component name
	 * @params {Function} callback
	 */

	process: function(name, callback) {
		callback = callback || _.noop;

		var newComponentsTree = this._calculateTree(name);

		this._applyTree({
			parentNode: null,
			oldNode: this.componentsTree,
			node: newComponentsTree
		}, callback);
	},

	_calculateTree: function(name, child) {
		var component = this.components[name];

		if (!component) {
			throw new Error('Unknown component with name "' + name + '"');
		}

		var node = {name: name};
		if (child) {
			node.child = child;
		}

		if (_.isString(component.parent)) {
			return this._calculateTree(component.parent, node);
		} else {
			return node;
		}
	},

	_isTreeNodeChanged: function(oldNode, node) {
		if (!oldNode || oldNode.name !== node.name || !oldNode.view) return true;
		var component = this.components[node.name];
		if (oldNode.view instanceof component.View === false) return true;
		if (!oldNode.view.attached) return true;
		return !oldNode.view.isUnchanged();
	},

	_applyTree: function(params, callback) {
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
				self._applyTree({
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

		if (this._isTreeNodeChanged(oldNode, node)) {
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
					.extendOwn(_(component).result('viewOptions'), this.viewOptions)
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
	}
});

/*
 * There is no good exports of extend method from backbone.
 * Take it from View and add to ComponentsManager
 *  because no other ways, ughh :-S.
 */

ComponentsManager.extend = View.extend;

module.exports = ComponentsManager;
