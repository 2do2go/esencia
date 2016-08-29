'use strict';

define([
	'chai', 'underscore', 'esencia'
], function(chai, _, esencia) {
	var expect = chai.expect;
	var ComponentsManager = esencia.ComponentsManager;
	var View = esencia.View;

	describe('ComponentsManager', function() {
		describe('constructor', function() {
			it('should set default options', function() {
				var cm = new ComponentsManager();
				expect(cm.options).to.be.eql({});
				expect(cm.rootEl).to.be.equal('html');
				expect(cm.autoAddRoot).to.be.true;
				expect(cm.defaultParent).to.be.a('string');
				expect(cm.components).to.be.an('object');
				expect(cm.tree).to.be.eql([]);
				var rootComponent = cm.get(cm.defaultParent);
				expect(rootComponent).to.be.an('object');
			});

			it('should not add root if `autoAddRoot` option is false', function() {
				var cm = new ComponentsManager({autoAddRoot: false});
				expect(cm.options).to.be.eql({autoAddRoot: false});
				expect(cm.components).to.be.eql({});
				expect(cm.defaultParent).to.be.undefined;
			});
		});

		describe('.add', function() {
			describe('should throw error', function() {
				it('if component `name` option has wrong type', function() {
					var cm = new ComponentsManager();

					expect(function() {
						cm.add({name: 1});
					}).to.throw('Component `name` option should be a string');
				});

				it('if component name is not uniq', function() {
					var cm = new ComponentsManager();
					cm.add({name: 'A', parent: null, View: View});

					expect(function() {
						cm.add({name: 'A', parent: null});
					}).to.throw('Duplicate component with name "A"');
				});

				it('if component has not a `View` option', function() {
					var cm = new ComponentsManager();

					expect(function() {
						cm.add({name: 'A', parent: null});
					}).to.throw('Component `View` option is required');
				});

				it('if component `parent` is not set and default parent is undefined',
					function() {
						var cm = new ComponentsManager({autoAddRoot: false});

						expect(function() {
							cm.add({name: 'A', View: View});
						}).to.throw(
							'Default root component is not set, add root component first'
						);
					}
				);

				it('if component `parent` option has wrong type', function() {
					var cm = new ComponentsManager();

					expect(function() {
						cm.add({name: 'A', View: View, parent: 1});
					}).to.throw('Component `parent` option should be a string or null');
				});

				it('if root component has a container', function() {
					var cm = new ComponentsManager();
					expect(function() {
						cm.add({name: 'A', parent: null, container: '#a', View: View});
					}).to.throw('Root component could not have a container');
				});

				it('if non-root component has not a container', function() {
					var cm = new ComponentsManager();
					expect(function() {
						cm.add({name: 'A', parent: 'B', View: View});
					}).to.throw(
						'Component `container` option is required for components with parent'
					);
				});

				it('if container selector is not a string', function() {
					var cm = new ComponentsManager();
					expect(function() {
						cm.add({name: 'A', container: 1, View: View});
					}).to.throw('Component `container` option should be a string selector');
				});
			});

			describe('should add component', function() {
				it('with null parent (root component)', function() {
					var cm = new ComponentsManager({autoAddRoot: false});
					var component = cm.add({parent: null, View: View});
					expect(component.name).to.include('__COMPONENT_');
					expect(component.parent).to.be.null;
					expect(cm.defaultParent).to.be.equal(component.name);
					expect(cm.components).to.have.all.property(component.name, component);
				});

				it('with user options', function() {
					var cm = new ComponentsManager();
					var component = cm.add({
						name: 'B',
						parent: 'A',
						container: '#b',
						View: View,
						models: {m: 1},
						collections: {c: 2},
						viewOptions: {o: 3}
					});
					expect(component).to.be.an('object');
					expect(component.name).to.be.equal('B');
					expect(component.parent).to.be.equal('A');
					expect(component.container).to.be.equal('#b');
					expect(component.View).to.be.equal(View);
					expect(component.models).to.be.eql({m: 1});
					expect(component.collections).to.be.eql({c: 2});
					expect(component.viewOptions).to.be.eql({o: 3});
					expect(cm.components).to.have.all.property(component.name, component);
				});

				it('with default parent name', function() {
					var cm = new ComponentsManager();
					var component = cm.add({container: '#a', View: View});
					expect(component.parent).to.be.equal(cm.defaultParent);
				});

				it('with string parent name', function() {
					var cm = new ComponentsManager();
					var component = cm.add({parent: 'B', container: '#a', View: View});
					expect(component.parent).to.be.equal('B');
				});

				it('with `default` option', function() {
					var cm = new ComponentsManager();
					var component = cm.add({parent: null, View: View, default: true});
					expect(component.name).to.be.equal(cm.defaultParent);
				});
			});
		});

		describe('._buildTree', function() {
			describe('should throw error', function() {
				it('if component name is unknown', function() {
					var cm = new ComponentsManager();

					expect(function() {
						cm._buildTree(['A']);
					}).to.throw('Component with name "A" does not exist');
				});

				it('if result tree is empty', function() {
					var cm = new ComponentsManager();

					expect(function() {
						cm._buildTree([]);
					}).to.throw('Components tree is empty');
				});

				it('if result tree has not root components', function() {
					/**
					 *  Components hierarchy:
					 *       A
					 *      / \
					 *     B - C
					 */

					var cm = new ComponentsManager();
					cm.add({name: 'A', parent: 'C', container: '#a', View: View});
					cm.add({name: 'C', parent: 'B', container: '#b', View: View});
					cm.add({name: 'B', parent: 'A', container: '#c', View: View});

					expect(function() {
						cm._buildTree(['A']);
					}).to.throw('Components tree should have at least one root node');
				});

				it('if containers and parents are same in one tree', function() {
					var cm = new ComponentsManager();
					cm.add({name: 'A', parent: null, View: View});
					cm.add({name: 'B', parent: 'A', container: '#a', View: View});
					cm.add({name: 'C', parent: 'A', container: '#a', View: View});

					expect(function() {
						cm._buildTree(['B', 'C']);
					}).to.throw(
						'Components could not have same container and parent in one tree'
					);
				});
			});

			describe('should create tree', function() {
				function checkTree(tree, expectedTree, expectedParent) {
					expectedParent = expectedParent || null;

					expect(tree).to.be.an('array');
					expect(tree).to.have.lengthOf(expectedTree.length);

					_(tree).each(function(node, index) {
						var expectedNode = expectedTree[index];

						expect(node).to.have.all.keys('component', 'children');
						expect(node.component).to.be.an('object');
						expect(node.component.name).to.be.equal(expectedNode.name);
						expect(node.component.parent).to.be.equal(expectedParent);
						expect(node.children).to.be.an('array');

						if (expectedNode.children) {
							checkTree(node.children, expectedNode.children, expectedNode.name);
						} else {
							expect(node.children).to.be.empty;
						}
					});
				}

				var cm;

				before(function() {
					/**
					 *  Components hierarchy:
					 *        A (root)      F (root)
					 *       / \            \
					 *      B   C            G
					 *     /     \
					 *    D       E
					 */

					cm = new ComponentsManager();
					cm.add({name: 'A', parent: null, View: View});
					cm.add({name: 'B', parent: 'A', container: 'b', View: View});
					cm.add({name: 'C', parent: 'A', container: 'c', View: View});
					cm.add({name: 'D', parent: 'B', container: 'd', View: View});
					cm.add({name: 'E', parent: 'C', container: 'e', View: View});
					cm.add({name: 'F', parent: null, View: View});
					cm.add({name: 'G', parent: 'F', container: 'g', View: View});
				});

				it('for single root component: A', function() {
					var tree = cm._buildTree(['A']);

					checkTree(tree, [{name: 'A'}]);
				});

				it('for single component: D', function() {
					var tree = cm._buildTree(['D']);

					checkTree(tree, [{
						name: 'A',
						children: [{
							name: 'B',
							children: [{
								name: 'D'
							}]
						}]
					}]);
				});

				it('for multiple components from same branch: [C, E]', function() {
					var tree = cm._buildTree(['C', 'E']);

					checkTree(tree, [{
						name: 'A',
						children: [{
							name: 'C',
							children: [{name: 'E'}]
						}]
					}]);
				});

				it('for multiple components from same level: [D, E]', function() {
					var tree = cm._buildTree(['D', 'E']);

					checkTree(tree, [{
						name: 'A',
						children: [{
							name: 'B',
							children: [{name: 'D'}]
						}, {
							name: 'C',
							children: [{name: 'E'}]
						}]
					}]);
				});

				it('for multiple components from different levels: [D, C]', function() {
					var tree = cm._buildTree(['D', 'C']);

					checkTree(tree, [{
						name: 'A',
						children: [{
							name: 'B',
							children: [{name: 'D'}]
						}, {name: 'C'}]
					}]);
				});

				it('for multiple components with different roots: [C, G]', function() {
					var tree = cm._buildTree(['C', 'G']);

					checkTree(tree, [{
						name: 'A',
						children: [{name: 'C'}]
					}, {
						name: 'F',
						children: [{name: 'G'}]
					}]);
				});
			});
		});
	});
});
