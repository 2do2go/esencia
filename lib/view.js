'use strict';

var _ = require('underscore');
var backbone = require('backbone');

// Take jquery or other selectors lib from backbone
var $ = backbone.$;

var splice = Array.prototype.splice;

// Cached regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// List of events type for nested entities processed by current view
var nestedEventTypes = ['views', 'collections', 'models'];

function isContainerSkipped(container, options) {
	return Boolean(
		(options.exclude && _(options.exclude).contains(container)) ||
		(options.include && !_(options.include).contains(container))
	);
}

/**
 * @class Esencia.View
 * @extend Backbone.View
 */

var View = {
	// Helpers (Object|Fuction) which will be passed to the template
	templateHelpers: {},

	// views are in the resolved state by default
	waitsCounter: 0,

	// this flag is used to check that .wait() is called
	// in the constructor/initialize
	waitAvailable: true,

	// views are not attached by default
	attached: false
};

var viewOptions = [
	'views', 'collections', 'models', 'data', 'events', 'router', 'templateHelpers'
];

/**
 * @constructor
 * @param {Object} [options]
 */

View.constructor = function(options) {
	var self = this;

	options = options || {};

	// nested views, collections, models and data are empty by default
	this.views = {};
	this.collections = {};
	this.models = {};
	this.data = {};

	// populate View instance with fields from options
	_.extend(this, _.pick(options, viewOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	if (this.template && !_.isFunction(this.template)) {
		throw new Error('View `template` option should be a function');
	}

	// create special hash object for all events for fast search
	this._prepareEvents();

	// normalize nested views hash
	this._prepareViews();

	// apply default backbone.View constructor
	backbone.View.apply(this, arguments);

	// set waiting state for current view if some nested view is in waiting state
	_(this.views).each(function(views) {
		_(views).each(function(view) {
			if (view.isWaiting()) {
				self.listenToOnce(view, 'resolve', self.wait());
			}
		});
	});

	// disable .wait(), it available only in the constructor/initialize
	this.waitAvailable = false;

	// we should delegate events after parent constructor call because
	// collections and models could be created in the initialize method

	// delegate events for each collection
	_(this.collections).each(function(collection, key) {
		self.delegateNestedEvents('collections', key, collection);
	});

	// delegate events for each model
	_(this.models).each(function(model, key) {
		self.delegateNestedEvents('models', key, model);
	});
};

/**
 * Update view data
 * Method is used to update view state, could be overriden to modify nested
 * views state
 *
 * @param {Object} [data] - new data object
 * @return {Esencia.View} - view instance for chaining
 */

View.setData = function(data) {
	if (data) this.data = data;
	return this;
};

/**
 * Check that view is changed and should be re-rendered
 * Method returns true by default (always unchanged), could be overriden
 * for specific logic
 *
 * @return {Boolean}
 */

View.isUnchanged = function() {
	return true;
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

	// TODO: think about promises
	return _.once(function() {
		_.defer(function() {
			self.waitsCounter--;
			if (!self.isWaiting()) {
				self.trigger('resolve');
			}
		});
	});
};

/**
 * @return {Boolean}
 */

View.isWaiting = function() {
	return this.waitsCounter > 0;
};

/**
 * Render view
 *
 * @override render
 * @param {Object} options
 * @param {Boolean} options.force
 * @return {Esencia.View} - view instance for chaining
 */

View._render = function(options) {
	// stop rendering if view in `waiting` state, resolve it first
	if (this.isWaiting()) return this;

	options = options || {};

	if (this.template) {
		// re-render template only if it exists and if it is necessary
		if (options.force || !this.attached || !this.isUnchanged()) {
			// detach view from DOM element
			this.detach();

			// render template with data
			var html = this.renderTemplate(this.template, this.getTemplateData());

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

	// render nested views
	this.renderViews(options);

	if (!this.parent || this.$container) {
		// attach all nested and current view first
		this.attach(options);
	}

	// return this for chaining
	return this;
};

/**
 * Render view by calling private _render method
 *
 * @override render
 * @return {Esencia.View} - view instance for chaining
 */

View.render = function(options) {
	return this._render(options);
};

/*
 * Get data for template rendering
 * Returns data by default, could be overriden
 *
 * @return {Object}
 */

View.getTemplateData = function() {
	return this.data;
};

/*
 * Render template with data. Returns html.
 *
 * @param {Function} template - template function for rendering
 * @param {Object} data - data for rendering
 * @return {String} - rendered html
 */

View.renderTemplate = function(template, data) {
	data = _(this).chain().result('templateHelpers').extend(data).value();

	// get html
	return template(data);
};

/*
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
			view.render(_(options).omit('include', 'exclude'));
		});

		// get first container or $el
		var $container = container ? self.$(container).first() : self.$el;

		if (!$container.length) {
			throw new Error('Container "' + container + '" is not found');
		}

		var containerEl = $container.get(0);

		// dom is changed if some view from group is not in current container
		var domChanged = _(viewsGroup).some(function(view) {
			return (
				!view.attached ||
				!view.$container ||
				view.$container.get(0) !== containerEl
			);
		});

		if (domChanged) {
			// re-append views group to container
			var $els = [];

			_(viewsGroup).each(function(view) {
				view.$container = $container;
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

/*
 * Set view to views group or replace some view in specified position
 * If index is passed it replace only one view with index in views group
 *
 * @param {Esencia.View} view - view to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 * @return {Esencia.View} - view instance for chaining
 */

View.setView = function(view, container, index) {
	return this._updateViews([view], container, index);
};

/*
 * Set views to views group or replace some view in specified position
 * If index is passed it replace only one view with index in views group
 *
 * @param {Esencia.View[]} views - views to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 * @return {Esencia.View} - view instance for chaining
 */

View.setViews = function(views, container, index) {
	return this._updateViews(views, container, index);
};

/*
 * Append view to end of views group
 * This method is alias for insertView without index argument
 *
 * @param {Esencia.View} view - view to append
 * @param {String} container - container of views group
 * @return {Esencia.View} - view instance for chaining
 */

View.appendView = function(view, container) {
	return this._insertViews([view], container);
};

/*
 * Append views to end of views group
 * This method is alias for insertViews without index argument
 *
 * @param {Esencia.View[]} views - views to append
 * @param {String} container - container of views group
 * @return {Esencia.View} - view instance for chaining
 */

View.appendViews = function(views, container) {
	return this._insertViews(views, container);
};

/*
 * Prepend view to start of views group
 * This method is alias for insertView with `0` as index argument value
 *
 * @param {Esencia.View} view - view to prepend
 * @param {String} container - container of views group
 * @return {Esencia.View} - view instance for chaining
 */

View.prependView = function(view, container) {
	return this._insertViews([view], container, 0);
};

/*
 * Prepend views to start of views group
 * This method is alias for insertViews with `0` as index argument value
 *
 * @param {Esencia.View[]} views - view to prepend
 * @param {String} container - container of views group
  * @return {Esencia.View} - view instance for chaining
 */

View.prependViews = function(views, container) {
	return this._insertViews(views, container, 0);
};

/*
 * Insert view to specified position of views group in the container
 * If index is not passed method inserts view to the end of views group (append)
 *
 * @param {Esencia.View} view - view to insert
 * @param {String} container - container of views group
 * @param {Number} [index] - position in views group
 * @return {Esencia.View} - view instance for chaining
 */

View.insertView = function(view, container, index) {
	return this._insertViews([view], container, index);
};

/*
 * Insert views to specified position of views group container
 * If index is not passed method inserts views to the end of views group
 *
 * @param {Esencia.View[]} views - views to insert
 * @param {String} container - container of views group
 * @param {Number} [index] - position in views group
 * @return {Esencia.View} - view instance for chaining
 */

View.insertViews = function(views, container, index) {
	return this._insertViews(views, container, index);
};

/*
 * Remove view from views group container by index or view instance
 * If index is passed it remove view in the index position
 *
 * @param {Esencia.View} [view] - view to remove
 * @param {String} container - container of views group
 * @param {Number} [index] - index of view in views group
 * @return {Esencia.View} - view instance for chaining
 */

View.removeView = function(view, container, index) {
	if (arguments.length < 2) {
		throw new Error('"view" or "index" arguments must be specified');
	}

	if (_.isString(view)) {
		index = container;
		container = view;
		view = this.getView(container, index);
		if (!view) return this;
	}

	return this._removeViews([view], container);
};

/*
 * Remove views from views group container
 * If views are passed remove only these views
 * Othervise remove all views from container
 *
 * @param {Esencia.View[]} [views] - views to remove
 * @param {String} container - container of views group
 * @return {Esencia.View} - view instance for chaining
 */

View.removeViews = function(views, container) {
	if (_.isString(views)) {
		container = views;
		views = this.getViews(container);
	}

	return this._removeViews(views, container);
};

/*
 * Get single view from container by index
 *
 * @param {String} container - container of views group
 * @param {Number} [index] - index of view in views group
 * @return {Esencia.View}
 */

View.getView = function(container, index) {
	return this.getViews(container)[index || 0] || null;
};

/*
 * Get views group from container
 *
 * @param {String} container - container of views group
 * @return {Esencia.View[]}
 */

View.getViews = function(container) {
	return _.clone(this.views[container]) || [];
};

View._insertViews = function(views, container, index) {
	var self = this;

	var viewsGroup = this.getViews(container);

	_(views).each(function(view) {
		if (view.parent) {
			view.parent.removeView(view, view.container);
		}
	});

	if (viewsGroup.length) {
		// if index is not specified set it value as last index of views group
		if (typeof index === 'undefined') {
			index = viewsGroup.length;
		}

		// insert views
		splice.apply(this.views[container], [index, 0].concat(views));
	} else {
		// if group is empty - set views as whole views group value
		this.views[container] = views;
	}

	// set each view parent to current
	_(views).each(function(view) {
		view.parent = self;
		view.container = container;
	});

	this.delegateNestedEvents('views', container, views);

	return this;
};

View._updateViews = function(views, container, index) {
	var oldViews;

	if (typeof index === 'undefined') {
		// if no index - get all views from group as old
		oldViews = this.getViews(container);
	} else {
		// if index is specified get view from specific position as old
		oldViews = this.getView(container, index);
		oldViews = oldViews ? [oldViews] : [];
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
	return this._insertViews(views, container, index);
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

		// undelegate all nested entity events
		self.undelegateNestedEvents(view);

		// unset view parent
		delete view.parent;
	});

	return this;
};

/*
 * Original setElement do undelegateEvents/delegateEvents, we remove it
 * because we have special detach/attach methods for this purpose
 *
 * @override setElement
 * @return {Esencia.View} - view instance for chaining
 */

View.setElement = function(element) {
	var $previousEl = this.$el;

	this._setElement(element);

	// insert html to $el
	if ($previousEl && this.$container) {
		$previousEl.replaceWith(this.$el);
	}

	return this;
};

/*
 * @override delegateEvents
 */

View.delegateEvents = function(events) {
	events = events || _.result(this, 'events');
	if (!events) return this;
	events = _(events).omit(nestedEventTypes);
	return backbone.View.prototype.delegateEvents.call(this, events);
};

View.delegateNestedEvents = function(type, key, entities) {
	var self = this;
	if (!_.isArray(entities)) entities = [entities];
	var listeners = this._nestedEventsHash[type][key];
	if (listeners) {
		_(listeners).each(function(listener) {
			_(entities).each(function(entity) {
				self.listenTo(entity, listener.eventName, listener.handler);
			});
		});
	}
	return this;
};

View.undelegateNestedEvents = function(entities) {
	var self = this;
	if (!_.isArray(entities)) entities = [entities];
	_(entities).each(function(entity) {
		self.stopListening(entity);
	});
	return this;
};

View._prepareEvents = function(events) {
	var self = this;

	// Hash for nested views events fast search
	this._nestedEventsHash = {};
	_(nestedEventTypes).each(function(type) {
		self._nestedEventsHash[type] = {};
	});

	events = events || _.result(this, 'events');
	if (!events) return;

	// bind all prefixed events to view then call native delegate events
	_(nestedEventTypes).each(function(type) {
		var typeEventsHash = self._nestedEventsHash[type];

		if (!_(events).has(type) || !_.isObject(events[type])) return;

		_(events[type]).each(function(method, key) {
			if (!_.isFunction(method)) method = self[method];
			if (!method) return;
			var match = key.match(delegateEventSplitter);
			var eventName = match[1];
			var entityKeys = match[2].replace(/ *, */g, ',').split(',');
			method = _.bind(method, self);

			// fill _nestedEventsHash
			_(entityKeys).each(function(entityKey) {
				typeEventsHash[entityKey] = typeEventsHash[entityKey] || [];
				typeEventsHash[entityKey].push({
					eventName: eventName,
					handler: method
				});
			});
		});
	});
};

/*
 * Wrap all non-array view groups to arrays with one element and delegate events
 */

View._prepareViews = function() {
	var self = this;

	_(this.views).each(function(views, container) {
		if (!_.isArray(views)) views = [views];
		self.views[container] = views;
		self.delegateNestedEvents('views', container, views);
	});
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
			view.attach(_(options).omit('include', 'exclude'));
		});
	});

	// return this for chaining
	return this;
};

/*
 * afterAttach is empty by default
 * It called after attach call, could be verriden to add some specific logic
 * for DOM manipulations
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.afterAttach = function() {
	return this;
};

/*
 * Attach new view to current view $el
 *
 * @return {Esencia.View} - view instance for chaining
 */

View._attach = function() {
	// return if current view is already attached
	if (this.attached) return this;

	// detach previous view
	// TODO: think about this behaviour, is it needed anymore?
	var previousView = this.$el.data('esencia-view');
	if (previousView) previousView.detach();

	// attach current view and set attr
	this.$el.data('esencia-view', this).attr('esencia-view', this.cid);

	// enable all DOM events
	this.delegateEvents();

	this.attached = true;

	// do some user afterAttach actions
	this.afterAttach();

	// trigger attach event
	this.trigger('attach');

	return this;
};

/*
 * Attach all nested and current view
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.attach = function(options) {
	// attach all nested views
	this.attachViews(options);

	// attach current view, return this for chaining
	return this._attach();
};

/**
 * Detach all nested views
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.detachViews = function() {
	// iterate by each views groups
	_(this.views).each(function(viewsGroup) {
		// return if views group is empty
		if (!viewsGroup.length) return;

		// call detach method for each nested view from views group
		_(viewsGroup).each(function(view) {
			view.detach();
		});
	});

	// return this for chaining
	return this;
};

/*
 * beforeDetach is empty by default
 * It called before detach method call, could be overriden to add some specific
 * logic before view detach from dom
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.beforeDetach = function() {
	return this;
};

/*
 * Detach view from current view $el
 *
 * @return {Esencia.View} - view instance for chaining
 */

View._detach = function() {
	// return if current view is not already attached
	if (!this.attached) return this;

	// trigger detach event
	this.trigger('detach');

	// do some user beforeDetach actions
	this.beforeDetach();

	// remove attr and data from $el
	this.$el.removeData('esencia-view').removeAttr('esencia-view');

	// disable all DOM events
	this.undelegateEvents();

	this.attached = false;

	// return this for chaining
	return this;
};

/*
 * Detach all nested and current view
 *
 * @return {Esencia.View} - view instance for chaining
 */

View.detach = function() {
	// detach all nested views
	this.detachViews();

	// detach current view, return this for chaining
	return this._detach();
};

/**
 * Remove view from parent container and remove element from DOM
 */

View.remove = function() {
	// remove current view from parent view container
	if (this.parent) {
		this.parent.removeView(this, this.container);
	}

	// detach view
	this.detach();

	// remove DOM element
	return backbone.View.prototype.remove.call(this);
};

/*
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
