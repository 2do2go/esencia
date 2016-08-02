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

View.wait = function() {
	var self = this;
	this._waiting = true;

	return function() {
		self._waiting = false;
		self.trigger('resolve');
	};
};

View.isWaiting = function() {
	return this._waiting;
};

/*
 * Override constructor
 *
 * @param {Object} [options]
 */

View.constructor = function(options) {
	var self = this;

	options = options || {};

	// Nested views hash is empty by default
	this.views = {};

	this.data = this.data || {};

	// populate View instance with fields from options
	_.extend(this, _.pick(options, viewOptions));
	// save original options, it is sometimes usefull
	this.options = options;

	if (this.template && !_.isFunction(this.template)) {
		throw new Error('View `template` option should be a function');
	}

	this._normalizeViews();
	this._prepareNestedEvents();

	this._waiting = false;

	// apply backbone.View constructor
	backbone.View.apply(this, arguments);

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

View.setData = function(data) {
	if (data) this.data = data;
};

View.isUnchanged = function() {
	return true;
};

/*
 * Override `render`
 */

View.render = function(options) {
	if (this.isWaiting()) return this;

	options = options || {};

	if (
		this.template &&
		(options.force || !this.isAttached() || !this.isUnchanged())
	) {
		this._createTemplateElement();

		// set tricky flag that used for calling after render
		// only after _createTemplateElement
		this._isAfterAttachNeeded = true;
	}

	// attach view to dom element
	this.attach();

	// render nested views
	this.renderViews(options);

	// call after attach method if el was set in parent view
	if (this.$el.parent().length) {
		this._afterAttachViews();
	}

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
 * Set html to $el element
 *
 * @param {object} [data] data for rendering (return value of getData)
 */

View._createTemplateElement = function() {
	var templateData = this.getTemplateData();
	var html = this.renderTemplate(this.template, templateData);
	var $html = $(html);

	if ($html.length > 1) {
		// @TODO: show warning here or something better?
	}

	var $newEl = $html.first();

	// insert html to $el
	if (this.$el.parent().length) {
		this.$el.replaceWith($newEl);
	}

	this.setElement($newEl, true);

	return this;
};


/*
 * Render all nested view
 *
 * @TODO: add some rendering optimizations
*/

View.renderViews = function(options) {
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

		if (_(viewsGroup).some(function(view) {
			return !view.isAttached() || !$container.is(view.$el.parent());
		})) {
			// put to $container
			$container.append(_(viewsGroup).pluck('$el'));
		}
	});
};

/*
 * Set view(s) to views group or replace some view in specified position
 * If index is passed it replace only one view with index in views group
 *
 * @param {View | View[]} views - view(s) to set
 * @param {String} container - container to set
 * @param {Number} [index] - index of view to replace
 */

View.setView = View.setViews = function(views, container, index) {
	return this._updateViews('set', views, container, index);
};

/*
 * Alias for setViews
 */

View.replaceView = View.replaceViews = function(views, container, index) {
	return this.setViews.apply(this, arguments);
};

/*
 * Append view(s) to end of views group
 * This method is alias for insertViews without index argument
 *
 * @param {View | View[]} views
 * @param {String} container - container of views group
 */

View.appendView = View.appendViews = function(views, container) {
	return this.insertViews(views, container);
};

/*
 * Prepend view(s) to start of views group
 * This method is alias for insertViews with `0` as index argument value
 *
 * @param {View | View[]} views
 * @param {String} container - container of views group
 */

View.prependView = View.prependViews = function(views, container) {
	return this.insertViews(views, container, 0);
};

/*
 * Insert view(s) to specified position of views group
 * If index is not passed views will insert to end of views group (append)
 *
 * @param {View | View[]} views
 * @param {String} container - container of views group
 * @param {Number} [index] - position in views group
 */

View.insertView = View.insertViews = function(views, container, index) {
	return this._updateViews('insert', views, container, index);
};

/*
 * Remove view(s) from views group by index or views instances list
 * If index is passed it remove only one view in index position
 * If views is passed it remove some of them, that places in views group
 *
 * @param {View | View[]} [views] - view(s) to remove
 * @param {String} container - container of views group
 * @param {Number} [index] - index of view in views group
 */

View.removeView = View.removeViews = function(views, container, index) {
	if (arguments.length < 2) {
		throw new Error('"views" or "index" arguments must be specified');
	}

	if (_.isString(views)) {
		index = container;
		container = views;
		views = this.getView(container, index);
		if (!views) return this;
	}

	return this._updateViews('remove', views, container);
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

/*
 * Common method for updating view(s) in views group with method
 *  `set`, `insert` or `remove`.
 *
 * @param {String} method - `set`, `insert` or `remove`
 * @paran {View | View[]} views
 * @param {String} container - container of views group
 * @param {Number} [index] - index of view in group
 */

View._updateViews = function(method, views, container, index) {
	var self = this;

	if (!views) {
		throw new Error('"views" argument must be specified');
	}

	if (!_.isArray(views)) views = [views];

	var viewsGroup = this.getViews(container);

	switch (method) {
		case 'set':
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
					this._updateViews('remove', removedViews, container);

					// and remove views
					_(removedViews).each(function(view) {
						view.remove();
					});
				}
			}

			// insert new views
			this._updateViews('insert', views, container, index);

			break;

		case 'insert':
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

			break;

		case 'remove':
			if (!viewsGroup.length) break;

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

			if (!viewObjs.length) break;

			_(viewObjs).each(function(viewObj) {
				var view = viewObj.view;

				// remove item from group
				splice.call(self.views[container], viewObj.index, 1);

				// undelegate all nested entity events
				self.undelegateNestedEvents(view);

				// unset view parent
				delete view.parent;
			});
	}

	return this;
};

/*
 * Override delegateEvents
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
 * Wrap all non-array views groups to arrays with one element
 */

View._normalizeViews = function() {
	var self = this;

	_(this.views).each(function(views, container) {
		if (!_.isArray(views)) {
			self.views[container] = [views];
		}
	});
};

/*
 * Get view attached state
 */

View.isAttached = function() {
	var view = this.$el.data('esencia-view');
	return Boolean(view && view === this);
};

View._afterAttachViews = function() {
	// iterate by each nested views groups
	_(this.views).each(function(viewsGroup) {
		// return if views group is empty
		if (!viewsGroup.length) return;

		// call _afterAttachViews for each views from views group
		_(viewsGroup).each(function(view) {
			view._afterAttachViews();
		});
	});

	// call afterAttach for current view
	if (this._isAfterAttachNeeded) {
		// remove after attach flag
		delete this._isAfterAttachNeeded;

		// call after attach
		this.afterAttach();
	}
};

/*
 * afterAttach is empty by default.
 * It called after _createTemplateElement, renderViews and attach calls
 * Override it to add some specific logic after template render.
 */

View.afterAttach = function() {
	return this;
};

/*
 * Detach all previous views and attach new view to current view $el
 */

View.attach = function() {
	// return if current view is already attached
	if (this.isAttached()) return this;

	// detach previous instance attached to this element
	var previousView = this.$el.data('esencia-view');
	if (previousView) previousView.detach();

	// attach current view and set attr
	this.$el.data('esencia-view', this).attr('esencia-view', this.cid);

	return this;
};

View._detachViews = function() {
	// iterate by each views groups
	_(this.views).each(function(viewsGroup) {
		// return if views group is empty
		if (!viewsGroup.length) return;

		// call _detachViews for each nested view from views group
		_(viewsGroup).each(function(view) {
			view.detach();
		});
	});
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
	if (!this.isAttached()) return this;

	// detach all nested views
	this._detachViews();

	// do some user actions
	this.beforeDetach();

	// remove attr and data from $el
	this.$el.removeData('esencia-view').removeAttr('esencia-view');

	// disable all events
	this.undelegateEvents();
	this.stopListening();

	return this;
};

View.remove = function() {
	if (this.parent) {
		this.parent.removeView(this, this.container);
	}
	this.detach();
	this._removeElement();
	return this;
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
