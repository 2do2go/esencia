'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var View = require('./view');

function isTreeNodeChanged(oldNode, node) {
	return Boolean(
		!oldNode ||
		oldNode.component.name !== node.component.name ||
		!oldNode.view ||
		oldNode.view instanceof node.component.View === false ||
		oldNode.view.isWaiting() ||
		!oldNode.view.attached ||
		!oldNode.view.isUnchanged()
	);
}

var ComponentsManager = function(options) {
	// populate ComponentsManager instance with fields from options
	_.extend(this, _.pick(options, componentManagerOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	// all components hash
	this.components = {};

	// current components tree that rendered at this moment
	this.tree = [];

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

		var tree = this._buildTree(names);
		var oldTree = this.tree;
		this.tree = [];

		this._applyTree({
			parent: {children: this.tree},
			oldTree: oldTree,
			tree: tree
		}, callback);
	},

	_buildTree: function(names) {
		var self = this;

		// internal function for recursion
		var buildHashedTree = function(names, tree) {
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

			// build new tree for parent components
			tree = buildHashedTree(parentNames, tree);

			// add each node to the parent children list if component has a parent
			_(nodes).each(function(node) {
				if (_.isString(node.component.parent)) {
					if (
						node.component.container &&
						_(tree[node.component.parent].children).find(function(child) {
							return child.component.container === node.component.container;
						})
					) {
						throw new Error(
							'Components could not have same container and parent in one tree'
						);
					}

					tree[node.component.parent].children.push(node);
				}
			});

			return tree;
		};

		var tree = buildHashedTree(names, {});

		if (_.isEmpty(tree)) {
			throw new Error('Components tree is empty');
		}

		// filter root components
		tree = _(tree).filter(function(node) {
			return _.isNull(node.component.parent);
		});

		if (!tree.length) {
			throw new Error('Components tree should have at least one root node');
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

	_applyTree: function(params, callback) {
		var self = this;

		var parent = params.parent;

		var afterCallback = _.after(params.tree.length, callback);

		var iterate = function(oldNode, node) {
			var container = node.component.container;

			var children = node.children;
			var oldChildren = oldNode ? oldNode.children : [];

			// set view data
			node.view.setData();

			if (!node.view.attached && container) {
				// render view with container from parent view
				parent.view
					.setView(node.view, container)
					.renderViews({include: [container]})
					.attachViews({include: [container]});
			} else {
				// exclude list is an union of old and new children
				var exclude = _.union(
					_(children).chain().map(function(child) {
						return child.component.container;
					}).compact().value(),
					_(oldChildren).chain().map(function(child) {
						return child.component.container;
					}).compact().value()
				);

				// render olf view or view without container directly
				node.view.render({exclude: exclude});
			}

			// clear children field in new node because it will set recursive
			// and should be empty in error case
			node.children = [];

			// save node to the parent children
			parent.children.push(node);

			// recursive call for children nodes
			self._applyTree({
				parent: node,
				oldTree: oldChildren,
				tree: children
			}, afterCallback);
		};

		_(params.tree).each(function(node, index) {
			// TODO: get oldNode in better way because it could be reordered
			var oldNode = params.oldTree[index] || null;

			if (isTreeNodeChanged(oldNode, node)) {
				if (oldNode && oldNode.view) {
					if (oldNode.component.container) {
						// remove old view if container for new view differs
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
						.extendOwn(_(node.component).result('viewOptions'), self.viewOptions)
						.value()
				);

				// stop processing old components tree by passing null as oldNode
				if (node.view.isWaiting()) {
					// wait when view will be resolved
					self.listenToOnce(node.view, 'resolve', function() {
						iterate(null, node);
					});
				} else {
					iterate(null, node);
				}
			} else {
				// save old view to new node
				node.view = oldNode.view;

				// process old components tree
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
