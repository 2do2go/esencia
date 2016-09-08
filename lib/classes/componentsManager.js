'use strict';

var _ = require('underscore');
var backbone = require('backbone');
var View = require('./view');
var extend = require('../utils/extend');

function isTreeNodeChanged(oldNode, node) {
	return Boolean(
		!oldNode ||
		oldNode.component.name !== node.component.name ||
		!oldNode.view ||
		oldNode.view instanceof node.component.View === false ||
		oldNode.view.isWaiting() ||
		!oldNode.view.attached ||
		oldNode.view.loadState()
	);
}

/**
 * @class Esencia.ComponentsManager
 */

var ComponentsManager = function(options) {
	options = options || {};

	// populate ComponentsManager instance with fields from options
	_.extend(this, _.pick(options, componentManagerOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	// all components hash
	this.components = {};

	// current components tree that loaded at this moment
	this.tree = [];

	// component names of the loaded tree at this moment
	this.currentNames = [];

	// add default root component, in most cases this is what you need
	if (this.autoAddRoot) this._addRoot();

	this.initialize.apply(this, arguments);
};

var componentManagerOptions = [
	'rootEl', 'autoAddRoot'
];

 var componentOptions = [
	'name', 'parent', 'container', 'View', 'model', 'models',
	'collection', 'collections', 'viewOptions'
];

_.extend(ComponentsManager.prototype, backbone.Events, {
	// You can set selector of any element at the page if you want restrict
	// specific page area that component manager will process
	rootEl: 'html',

	// Add default root component, in most cases this is what you need
	autoAddRoot: true,

	// Default parent component name is undefined until any root component will
	// added
	// When root component is added, it name will set as value of this field
	defaultParent: undefined,

	/**
	 * Initialize is an empty function by default. Override it with your own
	 * initialization logic.
	 */

	initialize: function() {},

	/**
	 * Add default root component to the components list
	 */

	_addRoot: function() {
		var RootView = View.extend({
			el: this.rootEl
		});

		this.add({
			parent: null,
			View: RootView
		});
	},

	/**
	 * Add component to the components list
	 *
	 * @param {Object} options
	 * @param {String} options.name - component name
	 * @param {View} options.View - component view constructor
	 * @param {String|Null} [options.parent] - component parent name or null
	 * for roots
	 * @param {String} [options.container] - view container, required if parent
	 * is string
	 * @param {Boolean} [options.load] - load component after add
	 */

	add: function(options) {
		options = _.defaults({}, options, {
			parent: this.defaultParent,
			load: false
		});

		var component = _.pick(options, componentOptions);

		var hasName = _.has(component, 'name');
		var hasContainer = _.has(component, 'container');
		var hasParent = _.isString(component.parent);
		var isRoot = _.isNull(component.parent);
		var hasDefaultParent = _.isString(this.defaultParent);

		if (hasName && !_.isString(component.name)) {
			throw new Error('Component `name` option should be a string');
		}

		if (hasName && _.has(this.components, component.name)) {
			throw new Error('Duplicate component with name "' + component.name + '"');
		}

		if (!_.has(component, 'View')) {
			throw new Error('Component `View` option is required');
		}

		if (!hasDefaultParent && _.isUndefined(component.parent)) {
			throw new Error(
				'Default root component is not set, add root component first'
			);
		}

		if (!hasParent && !isRoot) {
			throw new Error('Component `parent` option should be a string or null');
		}

		if (isRoot && hasContainer) {
			throw new Error('Root component could not have a container');
		}

		if (hasParent && !hasContainer) {
			throw new Error(
				'Component `container` option is required for components with parent'
			);
		}

		if (hasContainer && !_.isString(component.container)) {
			throw new Error('Component `container` option should be a string selector');
		}

		// generate uniq component name if compoent has not a name
		if (!hasName) {
			component.name = _.uniqueId('__COMPONENT_') + '__';
		}

		this.components[component.name] = component;

		if (isRoot && (!hasDefaultParent || options.default)) {
			this.defaultParent = component.name;
		}

		// process components tree in force mode
		if (options.load) {
			this.load(component.name);
		}

		return component;
	},

	/**
	 * Get component by name
	 *
	 * @param {String} name - component name
	 * @return {Object} component
	 */

	get: function(name) {
		var component = this.components[name];

		if (!component) {
			throw new Error('Component with name "' + name + '" does not exist');
		}

		return component;
	},

	/**
	 * Remove component by name
	 *
	 * @param {String} name - component name
	 */

	remove: function(name) {
		delete this.components[name];
	},

	/**
	 * Load components tree by name(s) and call a callback on done
	 *
	 * @param {String|String[]} [names] - component name or names list
	 * @param {Object} [options]
	 * @params {Function} [callback]
	 */

	load: function(names, options, callback) {
		if (_.isFunction(names)) {
			callback = names;
			names = undefined;
			options = undefined;
		}

		if (_.isFunction(options)) {
			callback = options;

			if (_.isArray(names) || _.isString(names)) {
				options = undefined;
			} else {
				options = names;
				names = undefined;
			}
		}

		names = names || this.currentNames;
		options = options || {};
		callback = callback || _.noop;

		if (!_.isArray(names)) names = [names];
		if (!names.length) {
			throw new Error('Component name or names to load should be set');
		}

		var treeNodes = this._buildTree(names);
		var oldTreeNodes = this.tree;
		this.tree = [];

		this.currentNames = names;

		this._applyTree({
			parent: {children: this.tree},
			oldNodes: oldTreeNodes,
			nodes: treeNodes
		}, options, callback);
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
					var component = self.get(name);

					// skip component if it is already in the tree
					if (_.has(tree, component.name)) return null;

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

	_applyTree: function(treeParams, options, callback) {
		var self = this;

		var parent = treeParams.parent;

		var afterCallback = _.after(treeParams.nodes.length, callback);

		var iterate = function(oldNode, node) {
			var container = node.component.container;

			var children = node.children;
			var oldChildren = oldNode ? oldNode.children : [];

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

				// render view without container directly
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
				oldNodes: oldChildren,
				nodes: children
			}, options, afterCallback);
		};

		_(treeParams.nodes).each(function(node, index) {
			// TODO get oldNode in better way
			var oldNode = treeParams.oldNodes[index] || null;

			if (isTreeNodeChanged(oldNode, node)) {
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
						.pick('model', 'models', 'collection', 'collections')
						.extend(
							_.result(node.component, 'viewOptions'),
							{componentsManager: self},
							options.viewOptions
						)
						.value()
				);

				// stop processing old components tree by passing null as oldNode
				if (node.view.isWaiting()) {
					// wait when view will be resolved
					self.listenToOnce(node.view, 'esencia:resolve', function() {
						iterate(null, node);
					});
				} else {
					iterate(null, node);
				}
			} else {
				// save old view to new node
				node.view = oldNode.view;

				// modify view state
				node.view.modifyState(options.viewOptions);

				// process old components tree
				iterate(oldNode, node);
			}
		});
	}
});

ComponentsManager.extend = extend;

module.exports = ComponentsManager;
