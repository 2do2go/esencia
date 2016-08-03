'use strict';

var _ = require('underscore');
var backbone = require('backbone');

/*
 * Take jquery or other selectors lib from backbone
 */

var $ = backbone.$;

/*
 * Helpers
 */

var splice = Array.prototype.splice;

/*
 * Cached regex to split keys for `delegate`.
 */

var delegateEventSplitter = /^(\S+)\s*(.*)$/;

var nestedEventTypes = ['views', 'collections', 'models'];

/*
 * Base View class extend backbone View class
 */

var View = {
	/*
	 * Helpers (Object|Fuction) which will be passed to the template
	 */

	templateHelpers: {}
};

var viewOptions = [
	'models', 'collections', 'views', 'events', 'data', 'router',
	'templateHelpers'
];

/*
 * @override constructor
 *
 * @param {Object} [options]
 */

View.constructor = function(options) {
	var self = this;

	options = options || {};

	// nested views hash is empty by default
	this.views = {};

	this.data = this.data || {};

	// populate View instance with fields from options
	_.extend(this, _.pick(options, viewOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	if (this.template && !_.isFunction(this.template)) {
		throw new Error('View `template` option should be a function');
	}

	// normalize nested views hash
	this._normalizeViews();

	// create special hash for all events for fast search
	this._prepareNestedEvents();

	// views are in the resolved state by default
	this.waiting = false;

	// views are not attached by default
	this.attached = false;

	// apply default backbone.View constructor
	backbone.View.apply(this, arguments);

	// we should delegate events after constructor call because collections and
	// models was created in the initialize method

	// delegate events for each collection
	if (this.collections) {
		_(this.collections).each(function(collection, key) {
			self.delegateNestedEvents('collections', key, collection);
		});
	}

	// delegate events for each model
	if (this.models) {
		_(this.models).each(function(model, key) {
			self.delegateNestedEvents('models', key, model);
		});
	}
};

/*
 * Method to change view data.
 * Router calls this method to update view data.
 *
 * @param {Object} [data]
 */

View.setData = function(data) {
	if (data) this.data = data;
};

/*
 * Method to check that view is changed and should be re-rendered
 * Returns true by default, override this method for specific logic
 */

View.isUnchanged = function() {
	return true;
};

/*
 * Method to switch view to waiting state
 */

View.wait = function() {
	var self = this;
	this.waiting = true;

	return function() {
		self.waiting = false;
		self.trigger('resolve');
	};
};

/*
 * @override `render`
 */

View.render = function(options) {
	console.log('>>>      render: %o %o', this, this.$el)

	// stop rendering if view in `waiting` state, resolve it first
	if (this.waiting) return this;

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
				throw new Error('View template produce empty html');
			}

			if ($el.length > 1) {
				throw new Error(
					'View template produce html with more than one root elements'
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
		// attach all nested views first
		this.attachViews();

		// attach current view
		this.attach();
	}

	// return this for chaining
	return this;
};

/*
 * Get data for template rendering
 */

View.getTemplateData = function() {
	return this.data;
};

/*
 * Render template with data. Returns html.
 *
 * @param {function} template for rendering
 * @params {object} data for rendering
 */

View.renderTemplate = function(template, data) {
	data = _(this).chain().result('templateHelpers').extend(data).value();

	// get html
	return template(data);
};

/*
 * Render all nested view
*/

View.renderViews = function(options) {
	console.log('>>> renderViews: %o %o', this, this.$el)

	var self = this;

	// iterate by each views group
	_(this.views).each(function(viewsGroup, container) {
		// return if view group is empty
		if (!viewsGroup.length) return;

		// call render for each views from view group
		_(viewsGroup).each(function(view) {
			view.render(options);
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

			// @TODO: add some rendering optimizations here

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
 * @param {View} view - view to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 */

View.setView = function(view, container, index) {
	return this._updateViews([view], container, index);
};

/*
 * Set views to views group or replace some view in specified position
 * If index is passed it replace only one view with index in views group
 *
 * @param {View[]} views - views to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 */

View.setViews = function(views, container, index) {
	return this._updateViews(views, container, index);
};

/*
 * Alias for setView
 *
 * @param {View} view - view to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 */

View.replaceView = function(view, container, index) {
	return this._updateViews([view], container, index);
};

/*
 * Alias for setViews
 *
 * @param {View[]} views - views to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 */

View.replaceViews = function(views, container, index) {
	return this._updateViews(views, container, index);
};

/*
 * Append view to end of views group
 * This method is alias for insertView without index argument
 *
 * @param {View} view - view to append
 * @param {String} container - container of views group
 */

View.appendView = function(view, container) {
	return this._insertViews([view], container);
};

/*
 * Append views to end of views group
 * This method is alias for insertViews without index argument
 *
 * @param {View[]} views - views to append
 * @param {String} container - container of views group
 */

View.appendViews = function(views, container) {
	return this._insertViews(views, container);
};

/*
 * Prepend view to start of views group
 * This method is alias for insertView with `0` as index argument value
 *
 * @param {View} views - view to prepend
 * @param {String} container - container of views group
 */

View.prependView = function(view, container) {
	return this._insertViews([view], container, 0);
};

/*
 * Prepend views to start of views group
 * This method is alias for insertViews with `0` as index argument value
 *
 * @param {View[]} views - view to prepend
 * @param {String} container - container of views group
 */

View.prependViews = function(views, container) {
	return this._insertViews(views, container, 0);
};

/*
 * Insert view to specified position of views group
 * If index is not passed method insert view to the end of views group (append)
 *
 * @param {View} view - view to insert
 * @param {String} container - container of views group
 * @param {Number} [index] - position in views group
 */

View.insertView = function(view, container, index) {
	return this._insertViews([view], container, index);
};

/*
 * Insert views to specified position of views group
 * If index is not passed method insert views to the end of views group (append)
 *
 * @param {View[]} views - views to insert
 * @param {String} container - container of views group
 * @param {Number} [index] - position in views group
 */

View.insertViews = function(views, container, index) {
	return this._insertViews(views, container, index);
};

/*
 * Remove view from views group by index or view instance
 * If index is passed it remove view in the index position
 *
 * @param {View} [view] - view to remove
 * @param {String} container - container of views group
 * @param {Number} [index] - index of view in views group
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
 * Remove views from views group
 * If views are passed remove only these views
 * Othervise remove all views from container
 *
 * @param {View[]} [views] - views to remove
 * @param {String} container - container of views group
 */

View.removeViews = function(views, container) {
	if (_.isString(views)) {
		container = views;
		views = this.getViews(container);
	}

	return this._removeViews(views, container);
};

/*
 * Get single view by container and index
 *
 * @param {String} container - container of views group
 * @param {Number} [index] - index of view in views group
 */

View.getView = function(container, index) {
	return this.getViews(container)[index || 0] || null;
};

/*
 * Get views group by container
 *
 * @param {String} container - container of views group
 */

View.getViews = function(container) {
	return _.clone(this.views[container]) || [];
};

View._insertViews = function(views, container, index) {
	console.log('>>> _insertViews:', views, container, index)

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
	console.log('>>> _updateViews:', views, container, index)

	var viewsGroup = this.getViews(container);

	if (viewsGroup.length) {
		var removedViews = [];

		// if views group is not empty
		if (typeof index !== 'undefined') {
			// if index is specified
			// remove view from specific position
			removedViews = this.getView(container, index);
			removedViews = removedViews ? [removedViews] : [];
		} else {
			// if no index - remove all views from views group
			removedViews = viewsGroup;
		}

		if (removedViews.length) {
			// if remove views array is not empty
			// remove from parent
			this._removeViews(removedViews, container);

			// and remove views
			_(removedViews).each(function(view) {
				view.remove();
			});
		}
	}

	// insert new views
	return this._insertViews(views, container, index);
};

View._removeViews = function(views, container) {
	console.log('>>> _removeViews:', views, container)

	var self = this;

	var viewsGroup = this.getViews(container);

	if (!viewsGroup.length) return this;

	var viewObjs = _.chain(views).uniq().map(function(view) {
			return {
				view: view,
				index: _.indexOf(viewsGroup, view)
			};
		}).filter(function(viewObj) {
			return viewObj.index >= 0;
		}).sortBy(function(viewObj) {
			return -viewObj.index;
		}).value();

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
 * @override setElement
 * Original setElement do undelegateEvents/delegateEvents, we remove it
 * because we have special detach/attach methods for this
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

View._prepareNestedEvents = function(events) {
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
 * Wrap all non-array view groups to arrays with one element
 */

View._normalizeViews = function() {
	var self = this;

	_(this.views).each(function(views, container) {
		if (!_.isArray(views)) {
			self.views[container] = [views];
		}
	});
};

View.attachViews = function() {
	// iterate by each nested views groups
	_(this.views).each(function(viewsGroup) {
		// return if views group is empty
		if (!viewsGroup.length) return;

		// call attach method for each nested view from views group
		_(viewsGroup).each(function(view) {
			// recursive attach all nested views
			view.attachViews();

			// attach current view
			view.attach();
		});
	});

	// return this for chaining
	return this;
};

/*
 * afterAttach is empty by default.
 * It called after attach call
 * Override it to add some specific logic for DOM manipulations.
 */

View.afterAttach = function() {
	return this;
};

/*
 * Detach all previous views and attach new view to current view $el
 */

View.attach = function() {
	// return if current view is already attached
	if (this.attached) return this;

	// detach previous view
	var previousView = this.$el.data('esencia-view');
	if (previousView) previousView.detach();

	// attach current view and set attr
	this.$el.data('esencia-view', this).attr('esencia-view', this.cid);

	// enable all DOM events
	this.delegateEvents();

	this.attached = true;

	// do some user afterAttach actions
	console.log('>>>      attach: %o %o', this, this.$el)
	this.afterAttach();

	return this;
};

View.detachViews = function() {
	// iterate by each views groups
	_(this.views).each(function(viewsGroup) {
		// return if views group is empty
		if (!viewsGroup.length) return;

		// call detach method for each nested view from views group
		_(viewsGroup).each(function(view) {
			// recursive detach all nested views
			view.detachViews();

			// detach current view
			view.detach();
		});
	});

	// return this for chaining
	return this;
};

/*
 * beforeDetach is empty by default.
 * It called before detach calls
 * Override it to add some specific logic before view detach from dom.
 */

View.beforeDetach = function() {
	return this;
};

/*
 * Detach view from current view $el
 */

View.detach = function() {
	// return if current view is not already attached
	if (!this.attached) return this;

	// do some user beforeDetach actions
	console.log('>>>      detach: %o %o', this, this.$el)
	this.beforeDetach();

	// remove attr and data from $el
	this.$el.removeData('esencia-view').removeAttr('esencia-view');

	// disable all DOM events
	this.undelegateEvents();

	this.attached = false;

	// return this for chaining
	return this;
};

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

/*
 * Get view, that attached to closest element with attr `esencia-view`
 *
 * @param {String | $} selector
 */

View.getClosestView = function(selector) {
	var $selector = $(selector);

	if (!$selector.is('[esencia-view]')) {
		$selector = $selector.closest('[esencia-view]');
	}

	return $selector.length ? $selector.data('esencia-view') : null;
};

module.exports = backbone.View.extend(View);
