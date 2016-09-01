'use strict';

define([
	'chai', 'underscore', 'esencia'
], function(chai, _, esencia) {
	var expect = chai.expect;
	var View = esencia.View;

	describe('View', function() {
		describe('.constructor()', function() {
			it('should set default fields', function() {
				var view = new View();

				expect(view).to.contain.keys('el', '$el');
				expect(view._entityEvents).to.be.eql({
					views: {},
					collections: {},
					models: {}
				});
				expect(view.waitsCounter).to.be.equal(0);
				expect(view.waitAvailable).to.be.false;
				expect(view.attached).to.be.false;

				_(['data', 'options', 'views', 'templateHelpers']).each(
					function(key) {
						expect(view[key]).to.be.eql({});
					}
				);
			});

			it('should set additional fields from options', function() {
				var view = new View({
					models: {model: 1},
					collections: {col: 1},
					views: {'#view': new View()},
					data: {a: 1},
					events: {b: 'method'},
					templateHelpers: {c: 3},
					componentsManager: {d: 4}
				});

				expect(view.models).to.have.property('model', 1);
				expect(view.collections).to.have.property('col', 1);
				expect(view.views).to.have.property('#view');
				expect(view.data).to.have.property('a', 1);
				expect(view.events).to.have.property('b', 'method');
				expect(view.templateHelpers).to.have.property('c', 3);
				expect(view.componentsManager).to.have.property('d', 4);
			});

			it('should set additional fields from prototype', function() {
				var options = {
					events: {b: 'method'},
					templateHelpers: {c: 3},
					router: {d: 4}
				};

				var view = new (View.extend(options))();

				_(options).each(function(value, key) {
					expect(view[key]).to.be.eql(value);
				});
			});

			it('should normalize nested views object', function() {
				var view = new View({
					views: {
						'#non-array': new View(),
						'#empty': []
					}
				});

				var viewsData = {
					'#non-array': 1,
					'#empty': 0
				};

				_(viewsData).each(function(length, selector) {
					expect(view.views).to.have.property(selector);
					expect(view.views[selector]).to.be.an('array');
					expect(view.views[selector]).to.have.lengthOf(length);
				});
			});

			it('should fill _entityEvents from events', function() {
				var view = new (View.extend({
					viewEvents: {
						'change #view1': function() {},
						'add #view1, #view2': 'viewMethod',
						'remove #view3': 'wrongMethod'
					},
					collectionEvents: {
						'change col1': function() {},
						'add col1, col2': 'colMethod',
						'remove col3': 'wrongMethod'
					},
					modelEvents: {
						'change model1': function() {},
						'add model1, model2': 'modelMethod',
						'remove model3': 'wrongMethod'
					},
					viewMethod: function() {},
					colMethod: function() {},
					modelMethod: function() {}
				}))();

				expect(view._entityEvents).to.be.an('object');
				expect(view._entityEvents.views).to.be.an('object');
				expect(view._entityEvents.collections).to.be.an('object');
				expect(view._entityEvents.models).to.be.an('object');

				var nestedEvents = {
					views: {
						'#view1': ['change', 'add'],
						'#view2': ['add']
					},
					collections: {
						'col1': ['change', 'add'],
						'col2': ['add']
					},
					models: {
						'model1': ['change', 'add'],
						'model2': ['add']
					}
				};

				_(nestedEvents).each(function(events, entityType) {
					_(events).each(function(eventNames, entityName) {
						expect(view._entityEvents[entityType]).to.have.property(entityName);
						expect(view._entityEvents[entityType][entityName]).to.be.an('array');
						expect(view._entityEvents[entityType][entityName]).to.have
							.lengthOf(eventNames.length);

						_(eventNames).each(function(eventName, index) {
							var eventItem = view._entityEvents[entityType][entityName][index];
							expect(eventItem).to.be.an('object');
							expect(eventItem.name).to.be.equal(eventName);
							expect(eventItem.listener).to.be.a('function');
						});
					});
				});

				expect(view._entityEvents.views).to.not.have.property('#view3');
				expect(view._entityEvents.collections).to.not.have.property('#col3');
				expect(view._entityEvents.models).to.not.have.property('#model3');
			});
		});

		describe('.prependView()', function() {
			it('should prepend view', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();

				view.prependView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(3);
				expect(view.views['#selector'][0]).to.be.equal(nestedView);
			});
		});

		describe('.prependViews()', function() {
			it('should prepend views array', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView1 = new View();
				var nestedView2 = new View();

				view.prependViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(4);
				expect(view.views['#selector'][0]).to.be.equal(nestedView1);
				expect(view.views['#selector'][1]).to.be.equal(nestedView2);
			});
		});

		describe('.appendView()', function() {
			it('should append view', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();

				view.appendView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(3);
				expect(view.views['#selector'][2]).to.be.equal(nestedView);
			});
		});

		describe('.appendViews()', function() {
			it('should append views array', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView1 = new View();
				var nestedView2 = new View();

				view.appendViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(4);
				expect(view.views['#selector'][2]).to.be.equal(nestedView1);
				expect(view.views['#selector'][3]).to.be.equal(nestedView2);
			});
		});

		describe('.addView()', function() {
			it('should insert view at the index', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();

				view.addView(nestedView, '#selector', {at: 1});

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(3);
				expect(view.views['#selector'][1]).to.be.equal(nestedView);
			});

			it('should insert view at the end (like appendView)', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();

				view.addView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(3);
				expect(view.views['#selector'][2]).to.be.equal(nestedView);
			});
		});

		describe('.addViews()', function() {
			it('should insert views array at the index', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView1 = new View();
				var nestedView2 = new View();

				view.addViews([nestedView1, nestedView2], '#selector', {at: 1});

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(4);
				expect(view.views['#selector'][1]).to.be.equal(nestedView1);
				expect(view.views['#selector'][2]).to.be.equal(nestedView2);
			});

			it('should insert views array at the end (like appendView)', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView1 = new View();
				var nestedView2 = new View();

				view.addViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(4);
				expect(view.views['#selector'][2]).to.be.equal(nestedView1);
				expect(view.views['#selector'][3]).to.be.equal(nestedView2);
			});
		});

		describe('.setView()', function() {
			it('should set view', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();
				view.setView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(1);
				expect(view.views['#selector'][0]).to.be.equal(nestedView);
			});

			it('should set view at the index', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();
				view.setView(nestedView, '#selector', {at: 1});

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(2);
				expect(view.views['#selector'][1]).to.be.equal(nestedView);
			});
		});

		describe('.setViews()', function() {
			it('should set views array', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView1 = new View();
				var nestedView2 = new View();
				view.setViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(2);
				expect(view.views['#selector'][0]).to.be.equal(nestedView1);
				expect(view.views['#selector'][1]).to.be.equal(nestedView2);
			});

			it('should set views array at the index', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView1 = new View();
				var nestedView2 = new View();
				view.setViews([nestedView1, nestedView2], '#selector', {at: 1});

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(3);
				expect(view.views['#selector'][1]).to.be.equal(nestedView1);
				expect(view.views['#selector'][2]).to.be.equal(nestedView2);
			});
		});

		describe('.removeView()', function() {
			it('should remove view by instance', function() {
				var nestedView = new View();

				var view = new View({
					views: {
						'#selector': [new View(), nestedView, new View()]
					}
				});

				view.removeView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(2);
			});

			it('should remove view by index', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View(), new View()]
					}
				});

				view.removeView('#selector', 1);

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(2);
			});
		});

		describe('.removeViews()', function() {
			it('should remove views array', function() {
				var nestedView1 = new View();
				var nestedView2 = new View();

				var view = new View({
					views: {
						'#selector': [
							new View(), nestedView1, new View(), nestedView2
						]
					}
				});

				view.removeViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.lengthOf(2);
			});
		});
	});
});
