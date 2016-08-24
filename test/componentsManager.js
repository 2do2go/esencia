'use strict';

define([
	'chai', 'underscore', 'esencia'
], function(chai, _, esencia) {
	var expect = chai.expect;
	var ComponentsManager = esencia.ComponentsManager;
	var View = esencia.View;

	describe('ComponentsManager', function() {
		describe('.add', function() {

		});

		describe('._buildTree', function() {
			describe('should throw error', function() {
				it('if component name is unknown', function() {
					var componentsManager = new ComponentsManager();

					expect(function() {
						componentsManager._buildTree(['A']);
					}).to.throw('Unknown component with name "A"');
				});

				it('if result tree is empty', function() {
					var componentsManager = new ComponentsManager();

					expect(function() {
						componentsManager._buildTree([]);
					}).to.throw('Components tree is empty');
				});

				it('if result tree has not root components', function() {
					/**
					 *  Components hierarchy:
					 *       A
					 *      / \
					 *     B - C
					 */

					var componentsManager = new ComponentsManager();
					componentsManager.add({name: 'A', parent: 'C', View: View});
					componentsManager.add({name: 'C', parent: 'B', View: View});
					componentsManager.add({name: 'B', parent: 'A', View: View});

					expect(function() {
						componentsManager._buildTree(['A']);
					}).to.throw('Components tree should have at least one root node');
				});

				it('if root component has a container', function() {
					var componentsManager = new ComponentsManager();
					componentsManager.add({
						name: 'A',
						parent: null,
						container: '#a',
						View: View
					});

					expect(function() {
						componentsManager._buildTree(['A']);
					}).to.throw('Root component could not have a container');
				});

				it('if containers and parents are same in one tree', function() {
					var componentsManager = new ComponentsManager();
					componentsManager.add({name: 'A', parent: null, View: View});
					componentsManager.add({
						name: 'B',
						parent: 'A',
						container: '#a',
						View: View
					});
					componentsManager.add({
						name: 'C',
						parent: 'A',
						container: '#a',
						View: View
					});

					expect(function() {
						componentsManager._buildTree(['B', 'C']);
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

				/**
				 *  Components hierarchy:
				 *        A (root)      F (root)
				 *       / \            \
				 *      B   C            G
				 *     /     \
				 *    D       E
				 */

				var componentsManager = new ComponentsManager();
				componentsManager.add({name: 'A', parent: null, View: View});
				componentsManager.add({name: 'B', parent: 'A', View: View});
				componentsManager.add({name: 'C', parent: 'A', View: View});
				componentsManager.add({name: 'D', parent: 'B', View: View});
				componentsManager.add({name: 'E', parent: 'C', View: View});
				componentsManager.add({name: 'F', parent: null, View: View});
				componentsManager.add({name: 'G', parent: 'F', View: View});

				it('for single root component: A', function() {
					var tree = componentsManager._buildTree(['A']);

					checkTree(tree, [{name: 'A'}]);
				});

				it('for single component: D', function() {
					var tree = componentsManager._buildTree(['D']);

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
					var tree = componentsManager._buildTree(['C', 'E']);

					checkTree(tree, [{
						name: 'A',
						children: [{
							name: 'C',
							children: [{name: 'E'}]
						}]
					}]);
				});

				it('for multiple components from same level: [D, E]', function() {
					var tree = componentsManager._buildTree(['D', 'E']);

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
					var tree = componentsManager._buildTree(['D', 'C']);

					checkTree(tree, [{
						name: 'A',
						children: [{
							name: 'B',
							children: [{name: 'D'}]
						}, {name: 'C'}]
					}]);
				});

				it('for multiple components with different roots: [C, G]', function() {
					var tree = componentsManager._buildTree(['C', 'G']);

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
