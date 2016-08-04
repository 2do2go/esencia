'use strict';

define([
	'chai', 'underscore', 'esencia'
], function(chai, _, esencia) {
	var expect = chai.expect;

	describe('View', function() {
		describe('.constructor()', function() {
			it('should set default fields', function() {
				var view = new esencia.View();

				expect(view).to.contain.keys('el', '$el');
				expect(view._nestedEventsHash).to.be.eql({
					views: {},
					collections: {},
					models: {}
				});
				expect(view.waiting).to.be.equal(false);
				expect(view.attached).to.be.equal(false);

				_(['data', 'options', 'views', 'templateHelpers']).each(
					function(key) {
						expect(view[key]).to.be.eql({});
					}
				);
			});

			it('should set additional fields from options', function() {
				var options = {
					models: {model: 1},
					collections: {col: 1},
					views: {'#view': 1},
					data: {a: 1},
					events: {b: 'method'},
					templateHelpers: {c: 3},
					router: {d: 4}
				};

				var view = new esencia.View(options);

				_(options).each(function(value, key) {
					expect(view[key]).to.be.eql(value);
				});
			});

			it('should set additional fields from prototype', function() {
				var options = {
					events: {b: 'method'},
					templateHelpers: {c: 3},
					router: {d: 4}
				};

				var view = new (esencia.View.extend(options))();

				_(options).each(function(value, key) {
					expect(view[key]).to.be.eql(value);
				});
			});

			it('should normalize nested views object', function() {
				var view = new esencia.View({
					views: {
						'#non-array': new esencia.View(),
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
					expect(view.views[selector]).to.have.length(length);
				});
			});

			it('should fill _nestedEventsHash from events', function() {
				var view = new (esencia.View.extend({
					events: {
						views: {
							'change #view1': function() {},
							'add #view1, #view2': 'viewMethod',
							'remove #view3': 'wrongMethod'
						},
						collections: {
							'change col1': function() {},
							'add col1, col2': 'colMethod',
							'remove col3': 'wrongMethod'
						},
						models: {
							'change model1': function() {},
							'add model1, model2': 'modelMethod',
							'remove model3': 'wrongMethod'
						}
					},
					viewMethod: function() {},
					colMethod: function() {},
					modelMethod: function() {}
				}))();

				expect(view._nestedEventsHash).to.be.an('object');
				expect(view._nestedEventsHash.views).to.be.an('object');
				expect(view._nestedEventsHash.collections).to.be.an('object');
				expect(view._nestedEventsHash.models).to.be.an('object');

				var nestedEventsHash = {
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

				_(nestedEventsHash).each(function(typeEvents, type) {
					_(typeEvents).each(function(eventNames, entityName) {
						expect(view._nestedEventsHash[type]).to.have.property(entityName);
						expect(view._nestedEventsHash[type][entityName]).to.be.an('array');
						expect(view._nestedEventsHash[type][entityName]).to.have
							.length(eventNames.length);

						_(eventNames).each(function(eventName, index) {
							var eventItem = view._nestedEventsHash[type][entityName][index];
							expect(eventItem).to.be.an('object');
							expect(eventItem.eventName).to.be.equal(eventName);
							expect(eventItem.handler).to.be.a('function');
						});
					});
				});

				expect(view._nestedEventsHash.views).to.not.have.property('#view3');
				expect(view._nestedEventsHash.collections).to.not.have.property('#col3');
				expect(view._nestedEventsHash.models).to.not.have.property('#model3');
			});
		});

		describe('.prependView()', function() {
			it('should prepend view', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView = new esencia.View();

				view.prependView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][0]).to.be.equal(nestedView);
			});
		});

		describe('.prependViews()', function() {
			it('should prepend views array', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();

				view.prependViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(4);
				expect(view.views['#selector'][0]).to.be.equal(nestedView1);
				expect(view.views['#selector'][1]).to.be.equal(nestedView2);
			});
		});

		describe('.appendView()', function() {
			it('should append view', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView = new esencia.View();

				view.appendView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][2]).to.be.equal(nestedView);
			});
		});

		describe('.appendViews()', function() {
			it('should append views array', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();

				view.appendViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(4);
				expect(view.views['#selector'][2]).to.be.equal(nestedView1);
				expect(view.views['#selector'][3]).to.be.equal(nestedView2);
			});
		});

		describe('.insertView()', function() {
			it('should insert view at the index', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView = new esencia.View();

				view.insertView(nestedView, '#selector', 1);

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][1]).to.be.equal(nestedView);
			});

			it('should insert view at the end (like appendView)', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView = new esencia.View();

				view.insertView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][2]).to.be.equal(nestedView);
			});
		});

		describe('.insertViews()', function() {
			it('should insert views array at the index', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();

				view.insertViews([nestedView1, nestedView2], '#selector', 1);

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(4);
				expect(view.views['#selector'][1]).to.be.equal(nestedView1);
				expect(view.views['#selector'][2]).to.be.equal(nestedView2);
			});

			it('should insert views array at the end (like appendView)', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();

				view.insertViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(4);
				expect(view.views['#selector'][2]).to.be.equal(nestedView1);
				expect(view.views['#selector'][3]).to.be.equal(nestedView2);
			});
		});

		describe('.setView()', function() {
			it('should set view', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView = new esencia.View();
				view.setView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(1);
				expect(view.views['#selector'][0]).to.be.equal(nestedView);
			});

			it('should set view at the index', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView = new esencia.View();
				view.setView(nestedView, '#selector', 1);

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(2);
				expect(view.views['#selector'][1]).to.be.equal(nestedView);
			});
		});

		describe('.setViews()', function() {
			it('should set views array', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();
				view.setViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(2);
				expect(view.views['#selector'][0]).to.be.equal(nestedView1);
				expect(view.views['#selector'][1]).to.be.equal(nestedView2);
			});

			it('should set views array at the index', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View()]
					}
				});

				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();
				view.setViews([nestedView1, nestedView2], '#selector', 1);

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][1]).to.be.equal(nestedView1);
				expect(view.views['#selector'][2]).to.be.equal(nestedView2);
			});
		});

		describe('.removeView()', function() {
			it('should remove view by instance', function() {
				var nestedView = new esencia.View();

				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), nestedView, new esencia.View()]
					}
				});

				view.removeView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(2);
			});

			it('should remove view by index', function() {
				var view = new esencia.View({
					views: {
						'#selector': [new esencia.View(), new esencia.View(), new esencia.View()]
					}
				});

				view.removeView('#selector', 1);

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(2);
			});
		});

		describe('.removeViews()', function() {
			it('should remove views array', function() {
				var nestedView1 = new esencia.View();
				var nestedView2 = new esencia.View();

				var view = new esencia.View({
					views: {
						'#selector': [
							new esencia.View(), nestedView1, new esencia.View(), nestedView2
						]
					}
				});

				view.removeViews([nestedView1, nestedView2], '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(2);
			});
		});
	});
});
