'use strict';

define([
	'chai', 'underscore', './sandboxManager', 'esencia/view'
], function(chai, _, SandboxManager, View) {
	var expect = chai.expect;

	var sandboxManager = new SandboxManager();

	describe('View', function() {
		describe('.constructor()', function() {
			it('should set default fields', function() {
				var view = new View();

				expect(view.noel).to.be.equal(true);
				expect(view.el).to.be.an('object');
				expect(view.el.tagName).to.be.equal('DIV');
				expect(view.$el[0]).to.be.equal(view.el);

				_(['data', 'options', 'views', '_viewsEventsHash', 'templateHelpers']).each(
					function(key) {
						expect(view[key]).to.be.eql({});
					}
				);
			});

			it('should not set noel if el selector is passed', function() {
				var el = sandboxManager.getSelector();
				var view = new View({el: el});

				expect(view.noel).to.not.be.ok;
				expect(view.el).to.be.equal(sandboxManager.get(el).get(0));

				sandboxManager.remove(el);
			});

			it('should set additional fields from options', function() {
				var view = new View({
					models: {},
					collections: {},
					views: {},
					viewsEvents: {},
					urlParams: {}
				});

				_(['models', 'collections', 'views', 'viewsEvents', 'urlParams']).each(
					function(key) {
						expect(view[key]).to.be.eql({});
					}
				);
			});

			it('should set additional fields from prototype', function() {
				var view = new (View.extend({
					models: {},
					collections: {},
					views: {},
					viewsEvents: {},
					urlParams: {}
				}))();

				_(['models', 'collections', 'views', 'viewsEvents', 'urlParams']).each(
					function(key) {
						expect(view[key]).to.be.eql({});
					}
				);
			});

			it('should normalize nested views object', function() {
				var view = new View({
					views: {
						'#non-array': new View,
						'#empty': []
					}
				});

				var viewsData = {
					'#non-array': 1,
					'#empty': 0
				};

				_(viewsData).each(function(count, selector) {
					expect(view.views).to.have.property(selector);
					expect(view.views[selector]).to.be.an('array');
					expect(view.views[selector]).to.have.length(count);
				});
			});

			it('should fill _viewsEventsHash from viewsEvents', function() {
				var view = new (View.extend({
					viewsEvents: {
						'event1 #selector1': function() {},
						'event2 #selector1': 'method',
						'event3 #selector2, #selector3': function() {},
						'event4 #selector4': 'wrongMethod'
					},
					method: function() {}
				}))();

				expect(view._viewsEventsHash).to.be.an('object');

				var viewsEventsData = {
					'#selector1': ['event1', 'event2'],
					'#selector2': ['event3'],
					'#selector3': ['event3']
				};

				_(viewsEventsData).each(function(eventNames, selector) {
					expect(view._viewsEventsHash).to.have.property(selector);
					expect(view._viewsEventsHash[selector]).to.be.an('array');
					expect(view._viewsEventsHash[selector]).to.have.length(eventNames.length);

					_(eventNames).each(function(eventName, index) {
						var eventItem = view._viewsEventsHash[selector][index];
						expect(eventItem).to.be.an('object');
						expect(eventItem.eventName).to.be.equal(eventName);
						expect(eventItem.handler).to.be.a('function');
					});
				});

				expect(view._viewsEventsHash).to.not.have.property('#selector4');
			});
		});

		describe('._updateViews() + aliases', function() {
			it('should prepend view with method .prependView()', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();

				view.prependView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][0]).to.be.equal(nestedView);
			});

			it('should append view with method .appendView()', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();

				view.appendView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(3);
				expect(view.views['#selector'][2]).to.be.equal(nestedView);
			});

			it.skip('should set view with method .setView()', function() {
				var view = new View({
					views: {
						'#selector': [new View(), new View()]
					}
				});

				var nestedView = new View();
				view.setView(nestedView, '#selector');

				expect(view.views['#selector']).to.be.an('array');
				expect(view.views['#selector']).to.have.length(1);
				expect(view.views['#selector'][0]).to.be.equal(nestedView);
			});
		});
	});
});
