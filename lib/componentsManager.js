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
	this.tree = null;

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
	 * Process components tree by name(s) and call a callback on done
	 *
	 * @param {String|String[]} names - component name or names list
	 * @params {Function} callback
	 */

	process: function(names, callback) {
		if (!_.isArray(names)) names = [names];
		callback = callback || _.noop;

		var tree = this._calculateTree(names);
		var oldTree = this.tree;
		this.tree = [];

		this._applyTree({
			parent: {children: this.tree},
			oldTree: oldTree,
			tree: tree
		}, callback);
	},

	_calculateTree: function(names) {
		var self = this;

		// internal function for recursion
		var calculateHashedTree = function(names, tree) {
			// exit with empty tree if names list is empty
			if (!names.length) return tree;

			var parentNames = [];

			// create component nodes
			var nodes = _(names)
				.chain()
				.uniq()
				.map(function(name) {
					var component = self.components[name];

					if (!component) {
						throw new Error('Unknown component with name "' + name + '"');
					}

					// skip component if it is already in the tree
					if (_(tree).has(component.name)) return null;

					// create node
					var node = {
						component: component,
						children: []
					};

					// add parent name to the list
					if (_.isString(component.parent)) {
						parentNames.push(component.parent);
					}

					// add nodes to the hashed tree first to prevent cycles
					tree[component.name] = node;

					return node;
				})
				.compact()
				.value();

			// calculate new tree for parent components
			tree = calculateHashedTree(parentNames, tree);

			// add each node to the parent children list if component has a parent
			_(nodes).each(function(node) {
				if (_.isString(node.component.parent)) {
					tree[node.component.parent].children.push(node);
				}
			});

			return tree;
		};

		var tree = calculateHashedTree(names, {});

		if (_.isEmpty(tree)) {
			throw new Error('Calculated components tree is empty');
		}

		// filter root components
		tree = _(tree).filter(function(node) {
			return _.isNull(node.component.parent);
		});

		if (!tree.length) {
			throw new Error(
				'Calculated components tree should have at least one root node'
			);
		}

		if (
			_(tree).some(function(node) {
				return node.component.container;
			})
		) {
			throw new Error('Root component could not have a container');
		}

		return tree;
	},

	_isTreeNodeChanged: function(oldNode, node) {
		return Boolean(
			!oldNode ||
			oldNode.component.name !== node.component.name ||
			!oldNode.view ||
			oldNode.view instanceof node.component.View === false ||
			oldNode.view.isWaiting() ||
			!oldNode.view.attached ||
			!oldNode.view.isUnchanged()
		);
	},

	_applyTree: function(params, callback) {
		var self = this;

		var parent = params.parent;

		var iterate = function(oldNode, node) {
			// clear children field in new node because it will set recursive
			// and should be empty in error case
			var children = node.children;
			node.children = [];

			parent.children.push(node);

			var oldChildren = oldNode ? oldNode.children : [];

			self._applyTree({
				parent: node,
				oldTree: oldChildren,
				tree: children
			}, callback);
		};

		var onViewResolve = function(node) {
			node.view.setData();

			if (node.component.container) {
				parent.view
					.setView(node.view, node.component.container)
					.renderViews(/* TODO {include: [node.component.container]} */)
					.attachViews(/* TODO {include: [node.component.container]} */);
			} else {
				node.view.render();
			}

			// stop processing old components tree
			iterate(null, node);
		};

		_(params.tree).each(function(node, index) {
			// TODO get oldNode in better way
			var oldNode = params.oldTree[index] || null;

			if (this._isTreeNodeChanged(oldNode, node)) {
				if (oldNode && oldNode.view) {
					if (oldNode.component.container) {
						// remove old view if container for new view dirrent
						if (oldNode.component.container !== node.component.container) {
							oldNode.view.remove();
						}
					} else {
						// detach old view if it has not a container
						oldNode.view.detach();
					}
				}

				// create new view
				node.view = new (node.component.View)(
					_(node.component)
						.chain()
						.pick('models', 'collections')
						.extendOwn(_(node.component).result('viewOptions'), this.viewOptions)
						.value()
				);

				if (node.view.isWaiting()) {
					// wait when view will be resolved
					self.listenToOnce(node.view, 'resolve', function() {
						onViewResolve(node);
					});
				} else {
					onViewResolve(node);
				}
			} else {
				// save old view to new node
				node.view = oldNode.view;

				// set data and re-render old view
				node.view.setData();
				node.view.render(/* TODO {exclude: [children containers]} */);

				// proprocessing old components tree
				iterate(oldNode, node);
			}
		});
	}
});

/*
 * There is no good exports of extend method from backbone.
 * Take it from View and add to ComponentsManager
 *  because no other ways, ughh :-S.
 */

ComponentsManager.extend = View.extend;

module.exports = ComponentsManager;
