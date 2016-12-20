'use strict';

var _ = require('underscore');
var backbone = require('backbone');

// Take jquery or other selectors lib from backbone
var $ = backbone.$;

var splice = Array.prototype.splice;

// Cached regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;
var entityNamesSplitter = /\s*,\s*/g;

function isContainerSkipped(container, options) {
	var exclude = options.exclude;
	var include = options.include;
	return Boolean(
		exclude && _.contains(_.isArray(exclude) ? exclude : [exclude], container) ||
		include && !_.contains(_.isArray(include) ? include : [include], container)
	);
}

/**
 * @class Esencia.View
 * @extend Backbone.View
 */

var View = {
	// Helpers (Object|Fuction) which will be passed to the template
	templateHelpers: {},

	// Views are in the resolved state by default
	waitsCounter: 0,

	// This flag is used to check that .wait() is called
	// in the constructor/initialize
	waitAvailable: true,

	// Views are not attached by default
	attached: false,
};

var entityTypes = ['models', 'collections', 'views'];
var entityEventTypes = ['modelEvents', 'collectionEvents', 'viewEvents'];
var additionalViewOptions = [
	'componentsManager', 'template', 'templateHelpers', 'ui', 'triggers'
];
var stateOptions = ['data', 'models', 'collections', 'model', 'collection'];
var viewOptions = _.union(
	entityTypes, entityEventTypes, additionalViewOptions, stateOptions
);

/**
 * @constructor
 * @param {Object} [options]
 */

View.constructor = function(options) {
	var self = this;

	options = options || {};

	// populate View instance with fields from options
	_.extend(this, _.pick(options, viewOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	// initialize data
	this.data = _.result(this, 'data', {});

	// template data should be empty when view is rendered at first time
	this.templateData = {};

	// create special hash object for all entity events for fast search
	this._prepareEntityEvents();

	// create instances of nested models
	this._prepareModels();

	// create instances of nested collections
	this._prepareCollections();

	// prepare nested views: create instances and wrap to arrays
	this._prepareViews();

	// delegate events for each views group before constructor
	_(this.views).each(function(views, container) {
		self.delegateEntityEvents('views', container, views);
	});

	// apply default backbone.View constructor
	// omit model and collection because we alredy processed this options
	backbone.View.call(this, _.omit(options, 'model', 'collection'));

	// modify state of each nested view
	this.modifyViewsState(_.pick(options, stateOptions));

	// set waiting state for current view if some nested view is in waiting state
	_(this.views).each(function(views) {
		_(views).each(function(view) {
			if (view.isWaiting()) {
				self.listenToOnce(view, 'esencia:resolve', self.wait());
			}
		});
	});

	// disable .wait(), it available only in the constructor/initialize
	this.waitAvailable = false;

	// we should delegate events after parent constructor call because
	// collections and models could be created in the initialize method

	// delegate events for each collection
	_(this.collections).each(function(collection, name) {
		self.delegateEntityEvents('collections', name, collection);
	});

	if (this.collection) {
		this.delegateEntityEvents('collections', '', this.collection);
	}

	// delegate events for each model
	_(this.models).each(function(model, name) {
		self.delegateEntityEvents('models', name, model);
	});

	if (this.model) {
		this.delegateEntityEvents('models', '', this.model);
	}
};

/**
 * Modfy view state
 * Method is used to update view state
 *
 * @param {Object} [state] - new state object
 * @param {Object} [options]
 * @return {Esencia.View} - view instance for chaining
 */

View.modifyState = function(state, options) {
	state = _({}).defaults(state, {data: {}});
	options = _({}).defaults(options, {
		render: true
	});

	var self = this;

	_(stateOptions).each(function(stateOption) {
		if (!_.has(state, stateOption)) return;

		var targetObj, stateObj, objKeys;

		if (_.contains(['data', 'models', 'collections'], stateOption)) {
			stateObj = state[stateOption];

			if (!_.isObject(stateObj)) {
				throw new Error(
					'State property `' + stateOption + '` should be an object'
				);
			}

			targetObj = self[stateOption];
			objKeys = _.keys(stateObj);
		} else {
			targetObj = self;
			stateObj = state;
			objKeys = [stateOption];
		}

		_(objKeys).each(function(objKey) {
			if (
				_.has(targetObj, objKey) &&
				_.contains(['models', 'collections', 'model', 'collection'], stateOption)
			) {
				self.undelegateEntityEvents(targetObj[objKey]);
			}

			targetObj[objKey] = stateObj[objKey];

			if (_.contains(['models', 'collections'], stateOption)) {
				self.delegateEntityEvents(stateOption, objKey, stateObj[objKey]);
			}

			if (_.contains(['model', 'collection'], stateOption)) {
				self.delegateEntityEvents(stateOption + 's', '', stateObj[objKey]);
			}
		});
	});

	if (options.render) {
		this.modifyViewsState(state, options);
	} else {
		this.loadState();
	}

	return this;
};

View.loadState = function() {
	var stateChanged = false;

	if (this.template) {
		var templateData = this.getTemplateData();

		stateChanged = !this.isStatesEqual(this.templateData, templateData);

		if (stateChanged) this.templateData = templateData;
	}

	return stateChanged;
};

View.modifyViewsState = function() {
	return this;
};

/**
 * Check that view is changed and should be re-rendered
 * Method returns true by default (always unchanged), could be overriden
 * for specific logic
 *
 * @return {Boolean}
 */

View.isStatesEqual = function(oldState, newState) {
	return _.isEqual(oldState, newState);
};

/**
 * Switch view to the waiting state
 *
 * @return {Function} - callback function, should be called to resolve view
 */

View.wait = function() {
	if (!this.waitAvailable) {
		throw new Error('Method .wait() is available only in the constructor');
	}

	var self = this;

	this.waitsCounter++;

	this.trigger('esencia:wait');

	// TODO: think about promises
	return _.once(function() {
		_.defer(function() {
			self.waitsCounter--;
			if (!self.isWaiting()) {
				self.trigger('esencia:resolve');
			}
		});
	});
};

/**
 * Check view waiting state
 *
 * @return {Boolean}
 */

View.isWaiting = function() {
	return this.waitsCounter > 0;
};

/**
 * Render view
 *
 * @param {Object} options
 * @param {Boolean} options.force
 * @return {Esencia.View} - view instance for chaining
 */

View._render = function(options) {
	// stop rendering if view in `waiting` state, resolve it first
	if (this.isWaiting()) return this;

	options = options || {};

	if (this.template) {
		var stateChanged = this.loadState();

		// re-render template only if it exists and if it is necessary
		if (options.force || !this.attached || stateChanged) {
			// recursive detach all nested views
			this.detachViews(options);

			// detach view from DOM element
			this.detach();

			// render template with data
			var locals = _(this)
				.chain()
				.result('templateHelpers')
				.extend(this.templateData)
				.value();

			var html = this.renderTemplate(this.template, locals);

			if (!_.isString(html)) {
				throw new Error('`renderTemplate` method should return a HTML string');
			}

			// render html with jqeury (or other lib) call
			var $el = $(html);

			if (!$el.length) {
				throw new Error('View template produces empty html');
			}

			if ($el.length > 1) {
				throw new Error(
					'View template produces html with more than one root elements'
				);
			}

			this.setElement($el);
		}
	} else {
		// re-ensure element if it is not ensured
		if (!this.$el.length) this._ensureElement();
	}

	// trigger event
	this.trigger('esencia:render');

	// render nested views
	this.renderViews(options);

	if (!this.parent || this.$el.parent().length) {
		// attach all nested views first
		this.attachViews(options);

		// attach current view
		this.attach();
	}

	// return this for chaining
	return this;
};

/**
 * Render view by calling private _render method
 *
 * @override
 * @return {Esencia.View} - view instance for chaining
 */

View.render = function(options) {
	return this._render(options);
};

/**
 * Get data for template rendering
 * Returns data by default, could be overriden
 *
 * @return {Object}
 */

View.getTemplateData = function() {
	return {};
};

/**
 * Render template with data, return html
 * By default this method simply calls template function with data as argument
 * Override this function to change template rendering logic
 *
 * @param {Function} template - template function for rendering
 * @param {Object} data - data for rendering
 * @return {String} - rendered html
 */

View.renderTemplate = function(template, locals) {
	if (!_.isFunction(template)) {
		throw new Error('View `template` should be a function');
	}

	return template(locals);
};

/**
 * Render all nested view
 *
 * @param {Object} options
 * @param {Boolean} options.force
 * @return {Esencia.View} - view instance for chaining
*/

View.renderViews = function(options) {
	var self = this;

	// iterate by each views group
	_(this.views).each(function(viewsGroup, container) {
		if (isContainerSkipped(container, options)) return;

		// return if view group is empty
		if (!viewsGroup.length) return;

		// call render for each views from view group
		_(viewsGroup).each(function(view) {
			view.render(_.omit(options, 'include', 'exclude'));
		});

		// get first container or $el
		var $container = container ? self.$(container).first() : self.$el;

		if (!$container.length) {
			throw new Error('Container "' + container + '" is not found');
		}

		var containerEl = $container.get(0);

		// dom is changed if some view from group is not in current container
		var domChanged = _(viewsGroup).some(function(view) {
			var parentEl = view.$el.parent().get(0);
			return (
				!view.attached ||
				!parentEl ||
				parentEl !== containerEl
			);
		});

		if (domChanged) {
			// re-append views group to container
			var $els = [];

			_(viewsGroup).each(function(view) {
				$els.push(view.$el);
			});

			// TODO: add some rendering optimizations here

			// put all views to $container
			$container.append($els);
		}
	});

	// return this for chaining
	return this;
};

/**
 * Set view to the views group or replace some view at the specified position
 *
 * @param {Esencia.View} view
 * @param {String} container - container selector
 * @param {Object} [options]
 * @param {Integer} [options.at] - position in the group
 * @return {Esencia.View} - view instance for chaining
 */

View.setView = function(view, container, options) {
	return this._setViews([view], container, options);
};

/**
 * Set views to the views group or replace some view at the specified position
 *
 * @param {Esencia.View[]} views
 * @param {String} container - container selector
 * @param {Object} [options]
 * @param {Integer} [options.at] - position in the group
 * @return {Esencia.View} - view instance for chaining
 */

View.setViews = function(views, container, options) {
	return this._setViews(views, container, options);
};

/**
 * Append view to the end of views group
 *
 * @param {Esencia.View} view
 * @param {String} container - container selector
 * @param {Object} [options]
 * @return {Esencia.View} - view instance for chaining
 */

View.appendView = function(view, container, options) {
	options = _(options || {}).omit('at');
	return this._addViews([view], container, options);
};

/**
 * Append views to the end of views group
 *
 * @param {Esencia.View[]} views
 * @param {String} container - container selector
 * @param {Object} [options]
 * @return {Esencia.View} - view instance for chaining
 */

View.appendViews = function(views, container, options) {
	options = _(options || {}).omit('at');
	return this._addViews(views, container, options);
};

/**
 * Prepend view to start of views group
 *
 * @param {Esencia.View} view
 * @param {String} container - container selector
 * @param {Object} [options]
 * @return {Esencia.View} - view instance for chaining
 */

View.prependView = function(view, container, options) {
	options = _.extend({}, options, {at: 0});
	return this._addViews([view], container, options);
};

/**
 * Prepend views to start of views group
 *
 * @param {Esencia.View[]} views
 * @param {String} container - container selector
 * @param {Object} [options]
 * @return {Esencia.View} - view instance for chaining
 */

View.prependViews = function(views, container, options) {
	options = _.extend({}, options, {at: 0});
	return this._addViews(views, container, options);
};

/**
 * Insert view to the views group at the specified position
 * If options.at is not passed method inserts view to the end of
 * the views group (append-like)
 *
 * @param {Esencia.View} view
 * @param {String} container - container selector
 * @param {Object} [options]
 * @param {Integer} [options.at] - position in the group
 * @return {Esencia.View} - view instance for chaining
 */

View.addView = function(view, container, options) {
	return this._addViews([view], container, options);
};

/**
 * Insert views to the views group at the specified position
 * If options.at is not passed method inserts views to the end of
 * the views group (append-like)
 *
 * @param {Esencia.View[]} views
 * @param {String} container - container selector
 * @param {Object} [options]
 * @param {Integer} [options.at] - position in the group
 * @return {Esencia.View} - view instance for chaining
 */

View.addViews = function(views, container, options) {
	return this._addViews(views, container, options);
};

/**
 * Remove view from views group container by index or view instance
 * If index is passed it remove view at the specified position
 *
 * @param {Esencia.View} [view]
 * @param {String} container - container selector
 * @param {Integer} [at] - position in the group
 * @return {Esencia.View} - view instance for chaining
 */

View.removeView = function(view, container, at) {
	if (arguments.length < 2) {
		throw new Error('"view" or "at" arguments must be specified');
	}

	if (_.isString(view)) {
		at = container;
		container = view;
		view = this.getView(container, at);
		if (!view) return this;
	}

	return this._removeViews([view], container);
};

/**
 * Remove views from views group container
 * If views are passed remove only these views
 * Othervise remove all views from container
 *
 * @param {Esencia.View[]} [views]
 * @param {String} container - container selector
 * @return {Esencia.View} - view instance for chaining
 */

View.removeViews = function(views, container) {
	if (_.isString(views)) {
		container = views;
		views = this.getViews(container);
	}

	return this._removeViews(views, container);
};

/**
 * Get single view from views group at the specified position
 *
 * @param {String} container - container selector
 * @param {Integer} [at] - position in the group
 * @return {Esencia.View} - view instance for chaining
 */

View.getView = function(container, at) {
	return this.getViews(container)[at || 0] || null;
};

/**
 * Get views group
 *
 * @param {String} container - container selector
 * @return {Esencia.View[]} - view instance for chaining
 */

View.getViews = function(container) {
	return _.clone(this.views[container]) || [];
};

/**
 * Get views count in the views group
 *
 * @param {String} container - container selector
 * @return {Integer}
 */

View.getViewsCount = function(container) {
	return (this.views[container] || []).length;
};

View._addViews = function(views, container, options) {
	var self = this;

	var viewsGroup = this.getViews(container);

	// if index is not specified set it value as last index of views group
	options = _.defaults({}, options, {at: viewsGroup.length});

	_(views).each(function(view) {
		if (view.parent) {
			view.parent.removeView(view, view.container);
		}
	});


	// insert views
	if (!this.views[container]) this.views[container] = [];
	splice.apply(this.views[container], [options.at, 0].concat(views));

	// set each view parent to current
	_(views).each(function(view) {
		view.parent = self;
		view.container = container;
	});

	this.delegateEntityEvents('views', container, views);

	return this;
};

View._setViews = function(views, container, options) {
	options = options || {};

	var oldViews;

	if (_.isNumber(options.at)) {
		// if index is specified get view from specific position as old
		var oldView = this.getView(container, options.at);
		oldViews = oldView ? [oldView] : [];
	} else {
		// if no index - get all views from group as old
		oldViews = this.getViews(container);
	}

	// exit if views equal oldViews
	if (
		oldViews.length === views.length &&
		_(oldViews).all(function(oldView, index) {
			return oldView === views[index];
		})
	) return this;

	if (oldViews.length) {
		// if old views array is not empty remove them from parent view
		this._removeViews(oldViews, container);

		// and remove views from DOM
		_(oldViews).each(function(view) {
			view.remove();
		});
	}

	// insert new views
	return this._addViews(views, container, options);
};

View._removeViews = function(views, container) {
	var self = this;

	var viewsGroup = this.getViews(container);

	if (!viewsGroup.length) return this;

	var viewObjs = _(views)
		.chain()
		.uniq()
		.map(function(view) {
			return {
				view: view,
				index: _.indexOf(viewsGroup, view)
			};
		})
		.filter(function(viewObj) {
			return viewObj.index >= 0;
		})
		.sortBy(function(viewObj) {
			return -viewObj.index;
		})
		.value();

	if (!viewObjs.length) return this;

	_(viewObjs).each(function(viewObj) {
		var view = viewObj.view;

		// remove item from group
		splice.call(self.views[container], viewObj.index, 1);

		// undelegate all entity events
		self.undelegateEntityEvents(view);

		// unset view parent
		delete view.parent;
	});

	return this;
};

/**
 * Original setElement do undelegateEvents/delegateEvents, we remove it
 * because we have special detach/attach methods for this purpose
 *
 * @override
 * @return {Esencia.View} - view instance for chaining
 */

View.setElement = function(element) {
	var $previousEl = this.$el;

	this._setElement(element);

	// insert html to $el
	if ($previousEl && $previousEl.parent().length) {
		$previousEl.replaceWith(this.$el);
	}

	this.ensureUI();

	return this;
};

View.ensureUI = function(ui) {
	ui = ui || _.result(this, 'ui', {});
	var self = this;
	this.$ui = _(ui).mapObject(function(selector) {
		return self.$(selector);
	});
	return this;
};

View.delegateTriggers = function(triggers) {
	triggers = triggers || _.result(this, 'triggers');
	if (!triggers) return this;
	var self = this;
	this.undelegateTriggers();
	_(triggers).each(function(event, key) {
		var match = key.match(delegateEventSplitter);
		var eventName = match[1];
		var selector = match[2];
		self.delegateTrigger(eventName, selector, _.bind(self.trigger, self, event));
	});
	return this;
};

View.delegateTrigger = function(eventName, selector, listener) {
	this.$el.on(eventName + '.delegateTriggers' + this.cid, selector, listener);
	return this;
};

View.undelegateTriggers = function() {
	if (this.$el) this.$el.off('.delegateTriggers' + this.cid);
	return this;
};

View.undelegateTrigger = function(eventName, selector, listener) {
	this.$el.off(eventName + '.delegateTriggers' + this.cid, selector, listener);
	return this;
};

View.delegateEntityEvents = function(entityType, entityName, entities) {
	if (!_.has(this._entityEvents, entityType)) {
		throw new Error(
			'Wrong entity type "' + entityType + '", available values: ' +
			entityTypes.join(', ')
		);
	}

	var self = this;

	if (!entities) entities = this[entityType][entityName];
	if (!entities) return this;
	if (!_.isArray(entities)) entities = [entities];
	var events = this._entityEvents[entityType][entityName];
	if (events) {
		this.undelegateEntityEvents(entities);

		_(events).each(function(event) {
			_(entities).each(function(entity) {
				self.listenTo(entity, event.name, event.listener);
			});
		});
	}

	return this;
};

View.undelegateEntityEvents = function(entities) {
	var self = this;
	if (!_.isArray(entities)) entities = [entities];
	_(entities).each(function(entity) {
		self.stopListening(entity);
	});
	return this;
};

View._prepareEntityEvents = function() {
	var self = this;

	// Hash for entity events fast search
	this._entityEvents = {};
	_(entityTypes).each(function(entityType) {
		self._entityEvents[entityType] = {};
	});

	// bind all prefixed events to view then call native delegate events
	_(entityEventTypes).each(function(eventType, index) {
		var events = _.result(self, eventType);
		if (!events) return;
		var entityType = entityTypes[index];
		self._addEntityEvents(entityType, events);
	});
};

View._addEntityEvents = function(entityType, events) {
	var self = this;

	_(events).each(function(method, key) {
		if (!_.isFunction(method)) method = self[method];
		if (!method) return;
		var match = key.match(delegateEventSplitter);
		var eventName = match[1];
		var entityNames = match[2].replace(entityNamesSplitter, ',').split(',');
		method = _.bind(method, self);
		_(entityNames).each(function(entityName) {
			self._addEntityEvent(entityType, entityName, eventName, method);
		});
	});
};

View._addEntityEvent = function(entityType, entityName, eventName, listener) {
	var entityEvents = this._entityEvents[entityType];
	entityEvents[entityName] = entityEvents[entityName] || [];
	entityEvents[entityName].push({
		name: eventName,
		listener: listener
	});
};

/**
 * Wrap all non-array view groups to arrays with one element and delegate events
 */

View._prepareViews = function() {
	this.views = _.result(this, 'views', {});

	this.views = _(this.views).mapObject(function(views) {
		if (!views) return [];
		views = _.isArray(views) ? views : [views];
		return _(views).map(function(view) {
			return _.isFunction(view) ? new view() : view;
		});
	});
};

View._prepareModels = function() {
	this.models = _.result(this, 'models', {});

	this.models = _(this.models).mapObject(function(model) {
		return _.isFunction(model) ? new model() : model;
	});

	if (this.model && _.isFunction(this.model)) {
		this.model = new this.model();
	}
};

View._prepareCollections = function() {
	this.collections = _.result(this, 'collections', {});

	this.collections = _(this.collections).mapObject(function(collection) {
		return _.isFunction(collection) ? new collection() : collection;
	});

	if (this.collection && _.isFunction(this.collection)) {
		this.collection = new this.collection();
	}
};

/**
 * Attach all nested views
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.attachViews = function(options) {
	options = options || {};

	// iterate by each nested views groups
	_(this.views).each(function(viewsGroup, container) {
		if (isContainerSkipped(container, options)) return;

		// return if views group is empty
		if (!viewsGroup.length) return;

		// call attach method for each nested view from views group
		_(viewsGroup).each(function(view) {
			// recursive attach all nested views
			view.attachViews(_.omit(options, 'include', 'exclude'));

			// attach current view
			view.attach();
		});
	});

	// return this for chaining
	return this;
};

/**
 * beforeAttach is empty by default
 * It called before attach call, could be overriden to add some specific logic
 * before view will be attached to the DOM
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.beforeAttach = function() {
	return this;
};

/**
 * afterAttach is empty by default
 * It called after attach call, could be overriden to add some specific logic
 * for DOM manipulations
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.afterAttach = function() {
	return this;
};

/**
 * Attach new view to current view $el
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.attach = function() {
	// return if current view is already attached
	if (this.attached) return this;

	// do some user beforeAttach actions
	this.beforeAttach();

	// trigger attach event
	this.trigger('esencia:beforeAttach');

	var previousView = this.$el.data('esencia-view');
	if (previousView) {
		// recursive detach all nested views
		previousView.detachViews();

		// detach previous view
		previousView.detach();
	}

	// attach current view and set attr
	this.$el.data('esencia-view', this).attr('esencia-view', this.cid);

	// enable all DOM events
	this.delegateEvents();

	this.delegateTriggers();

	this.attached = true;

	// do some user afterAttach actions
	this.afterAttach();

	// trigger afterAttach event
	this.trigger('esencia:afterAttach');

	return this;
};

/**
 * Detach all nested views
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.detachViews = function(options) {
	options = options || {};

	// iterate by each views groups
	_(this.views).each(function(viewsGroup, container) {
		if (isContainerSkipped(container, options)) return;

		// return if views group is empty
		if (!viewsGroup.length) return;

		// call detach method for each nested view from views group
		_(viewsGroup).each(function(view) {
			// recursive detach all nested views
			view.detachViews(_.omit(options, 'include', 'exclude'));

			// detach current view
			view.detach();
		});
	});

	// return this for chaining
	return this;
};

/**
 * beforeDetach is empty by default
 * It is called before detach method call, could be overriden to add some
 * specific logic before view will be detached from DOM
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.beforeDetach = function() {
	return this;
};

/**
 * afterDetach is empty by default
 * It is called after detach method call, could be overriden to add some
 * specific logic after view will be detached from DOM
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.afterDetach = function() {
	return this;
};

/**
 * Detach view from current view $el
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.detach = function() {
	// return if current view is not already attached
	if (!this.attached) return this;

	// trigger beforeDetach event
	this.trigger('esencia:beforeDetach');

	// do some user beforeDetach actions
	this.beforeDetach();

	// remove attr and data from $el
	this.$el.removeData('esencia-view').removeAttr('esencia-view');

	// disable all DOM events
	this.undelegateEvents();

	this.undelegateTriggers();

	this.attached = false;

	// trigger afterDetach event
	this.trigger('esencia:afterDetach');

	// do some user afterDetach actions
	this.afterDetach();

	// return this for chaining
	return this;
};

/**
 * Remove view from parent container and remove element from DOM
 */

View.remove = function() {
	// remove current view from parent view container
	if (this.parent) {
		this.parent.removeView(this, this.container);
	}

	// detach all nested views first
	this.detachViews();

	// detach current view
	this.detach();

	// remove DOM element
	return backbone.View.prototype.remove.call(this);
};

/**
 * Get view, that attached to closest element with attr `esencia-view`
 *
 * @param {String | $} selector
 * @return {Esencia.View | Null}
 */

View.getClosestView = function(selector) {
	var $selector = $(selector);

	if (!$selector.is('[esencia-view]')) {
		$selector = $selector.closest('[esencia-view]');
	}

	return $selector.length ? $selector.data('esencia-view') : null;
};

module.exports = backbone.View.extend(View);
