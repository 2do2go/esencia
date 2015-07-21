'use strict';

(function (root, factory) {
	function makeGlobal(View) {
		root.esencia = root.esencia || {};
		root.esencia.View = View;
		return View;
	}

	// CommonJS
	if (typeof exports === 'object') {
		module.exports = factory(require('underscore'), require('backbone'));
		makeGlobal(module.exports);
	} else if (typeof define === 'function' && define.amd) {
	// AMD
		define(['underscore', 'backbone'], function(_, Backbone) {
			// Use global variables if the locals are undefined.
			var View = factory(_ || root._, Backbone || root.Backbone);
			return makeGlobal(View);
		});
	} else {
	// RequireJS isn't being used.
	// Assume underscore and backbone are loaded in <script> tags
		makeGlobal(factory(root._, root.Backbone));
	}
}(this, function(_, backbone) {
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

	/*
	 * Base View class extend backbone View class
	 */

	var View = {
		/*
		 * Helpers (Object|Fuction) which will be passed to the template
		 */

		templateHelpers: {}
	};

	/*
	 * Override constructor
	 * Set noel flag if elements is not defined
	 *
	 * @param {Object} [options]
	 */

	View.constructor = function(options) {
		options = options || {};

		// set no element flag if elements is not defined
		if (!(this.el || options.el)) {
			this.noel = true;
		}

		// Nested views hash is empty by default
		this.views = {};

		// Hash for views events fast search
		this._viewsEventsHash = {};

		this.data = this.data || {};

		// apply backbone.View constructor
		backbone.View.apply(this, arguments);
	};

	var viewOptions = ['models', 'collections', 'data', 'views', 'viewsEvents',
		'urlParams', 'templateHelpers'];

	/*
	 * Override `_configure` to add specific viewOptions
	 *
	 * @param {Object} [options]
	 */

	View._configure = function(options) {
		if (this.options) options = _.extend({}, _.result(this, 'options'), options);
		_.extend(this, _.pick(options, viewOptions));

		this._normalizeViews();

		this._prepareViewsEvents();

		// apply backbone.View _configure method
		backbone.View.prototype._configure.apply(this, arguments);
	};

	/*
	 * Override `render`
	 */

	View.render = function(options) {
		options = options || {};

		// render template of current view
		this.setData();
		var data = this.getData();
		if (!this.isAttached() || options.force || !this.isUnchanged(data)) {
			this.setHtml(data);
		}

		// render nested views
		this.renderViews(options);

		// call after render method if el was set in view
		if (this.$el.parent().length) {
			this.afterRenderViews();
		}

		return this;
	};

	/*
	 * afterRender is empty by default.
	 * It called after setHtml and renderViews calls
	 * Override it to add some specific logic after template render.
	 */

	View.afterRender = function() {
		return this;
	};

	View.afterRenderViews = function() {
		// iterate by each views groups
		_(this.views).each(function(viewsGroup) {
			// return if views group is empty
			if (!viewsGroup.length) return;

			// call afterRenderViews for each views from views group
			_(viewsGroup).each(function(view) {
				view.afterRenderViews();
			});
		});

		// call afterRender for current view
		if (this._isAfterRenderNeeded) {
			// remove after render flag
			delete this._isAfterRenderNeeded;

			// call after render
			this.afterRender();
		}
	};
	
	/*
	 * beforeDetach is empty by default.
	 * It called before detach calls
	 * Override it to add some specific logic before view detach from dom.
	 */

	View.beforeDetach = function() {
		return this;
	};

	View.beforeDetachViews = function() {
		// iterate by each views groups
		_(this.views).each(function(viewsGroup) {
			// return if views group is empty
			if (!viewsGroup.length) return;

			// call beforeDetachViews for each views from views group
			_(viewsGroup).each(function(view) {
				view.beforeDetachViews();
			});
		});

		this.beforeDetach();
	};

	/*
	 * Get data for template rendering
	 */

	View.getData = function() {
		return this.data;
	};

	View.setData = function(data) {
		if (data) this.data = data;
	};

	View.isUnchanged = function() {
		return true;
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

	View.setHtml = function(data) {
		if (!_.isFunction(this.template)) {
			throw new Error('Template should be a function.');
		}

		var templateHtml = this.renderTemplate(this.template, data);

		// insert html to $el
		if (this.noel) {
			var $templateHtml = $(templateHtml);

			if (this.isAttached()) {
				this.$el.replaceWith($templateHtml);
			}

			this.setElement($templateHtml.first(), true);
		} else {
			this.$el.html(templateHtml);
		}

		// attach view to dom element
		this.attach();

		// set tricky flag that used for calling after render
		// only after setHtml
		this._isAfterRenderNeeded = true;

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
		_(this.views).each(function(viewsGroup, selector) {
			// return if view group is empty
			if (!viewsGroup.length) return;

			// call render for each views from view group
			_(viewsGroup).each(function(view) {
				view.render(options);
			});

			// get first selector or $el
			var $selector = selector ? self.$(selector).first() : self.$el;

			var $els = _(viewsGroup).pluck('$el');

			// put to $selector
			if ($selector.length && _($els).some(function($el) {
				return !$selector.is($el.parent());
			})) {
				$selector.append($els);
			}
		});
	};

	/*
	 * Set view(s) to views group or replace some view in specified position
	 * If index is passed it replace only one view with index in views group
	 *
	 * @param {View | View[]} views - view(s) to set
	 * @param {String} selector - selector to set
	 * @param {Number} [index] - index of view to replace
	 */

	View.setView = View.setViews = function(views, selector, index) {
		return this._updateViews('set', views, selector, index);
	};

	/*
	 * Alias for setViews
	 */

	View.replaceView = View.replaceViews = function(views, selector, index) {
		return this.setViews.apply(this, arguments);
	};

	/*
	 * Append view(s) to end of views group
	 * This method is alias for insertViews without index argument
	 *
	 * @param {View | View[]} views
	 * @param {String} selector - selector of views group
	 */

	View.appendView = View.appendViews = function(views, selector) {
		return this.insertViews(views, selector);
	};

	/*
	 * Prepend view(s) to start of views group
	 * This method is alias for insertViews with `0` as index argument value
	 *
	 * @param {View | View[]} views
	 * @param {String} selector - selector of views group
	 */

	View.prependView = View.prependViews = function(views, selector) {
		return this.insertViews(views, selector, 0);
	};

	/*
	 * Insert view(s) to specified position of views group
	 * If index is not passed views will insert to end of views group (append)
	 *
	 * @param {View | View[]} views
	 * @param {String} selector - selector of views group
	 * @param {Number} [index] - position in views group
	 */

	View.insertView = View.insertViews = function(views, selector, index) {
		return this._updateViews('insert', views, selector, index);
	};

	/*
	 * Remove view(s) from views group by index or views instances list
	 * If index is passed it remove only one view in index position
	 * If views is passed it remove some of them, that places in views group
	 *
	 * @param {View | View[]} [views] - view(s) to remove
	 * @param {String} selector - selector of views group
	 * @param {Number} [index] - index of view in views group
	 */

	View.removeView = View.removeViews = function(views, selector, index) {
		if (arguments.length < 2) {
			throw new Error('"views" or "index" arguments must be specified');
		}

		if (_.isString(views)) {
			index = selector;
			selector = views;
			views = this.getView(selector, index);
			if (!views) return this;
		}

		return this._updateViews('remove', views, selector);
	};

	/*
	 * Get single view by selector and index
	 *
	 * @param {String} selector - selector of views group
	 * @param {Number} [index] - index of view in views group
	 */

	View.getView = function(selector, index) {
		return this.getViews(selector)[index || 0] || null;
	};

	/*
	 * Get views group by selector
	 *
	 * @param {String} selector - selector of views group
	 */

	View.getViews = function(selector) {
		return _.clone(this.views[selector]) || [];
	};

	/*
	 * Common method for updating view(s) in views group with method
	 *  `set`, `insert` or `remove`.
	 *
	 * @param {String} method - `set`, `insert` or `remove`
	 * @paran {View | View[]} views
	 * @param {String} selector - selector of views group
	 * @param {Number} [index] - index of view in group
	 */

	View._updateViews = function(method, views, selector, index) {
		var self = this;

		if (!views) {
			throw new Error('"views" argument must be specified');
		}

		if (!_.isArray(views)) {
			views = [views];
		}

		var viewsGroup = this.getViews(selector);

		switch (method) {
			case 'set':
				if (viewsGroup.length) {
					var removedViews = [];

					// if views group is not empty
					if (typeof index !== 'undefined') {
						// if index is specified
						// remove view from specific position
						removedViews = this.getView(selector, index);
						removedViews = removedViews ? [removedViews] : [];
					} else {
						// if no index - remove all views from views group
						removedViews = viewsGroup;
					}

					if (removedViews.length) {
						// if remove views array is not empty
						// remove from parent
						this._updateViews('remove', removedViews, selector);

						// and remove views
						_(removedViews).each(function(view) {
							view.remove();
						});
					}
				}

				// insert new views
				this._updateViews('insert', views, selector, index);

				break;

			case 'insert':
				// remove each view from parent if it has parent
				// @TODO: maybe autoremove?
				_(views).each(function(view) {
					if (view.parent) {
						throw new Error('View parent is already set. ' +
							'You should use removeView or removeViews before insert.');
					}
				});

				if (viewsGroup.length) {
					// if index is not specified set it value as last index of views group
					if (typeof index === 'undefined') {
						index = viewsGroup.length;
					}

					// insert views
					splice.apply(this.views[selector], [index, 0].concat(views));
				} else {
					// if group is empty - set views as whole views group value
					this.views[selector] = views;
				}

				// set each view parent to current
				_(views).each(function(view) {
					view.parent = self;
				});

				this.delegateViewsEvents(selector, views);

				break;

			case 'remove':
				if (!viewsGroup.length) break;

				_(views).each(function(view) {
					// get view index in group
					var index = _.indexOf(viewsGroup, view);

					// return if view is not in group
					if (!~index) return;

					// remove item from group
					splice.call(self.views[selector], index, 1);

					// undelegate all view events
					self.undelegateViewEvents(view);

					// unset view parent
					delete view.parent;
				});
		}

		return this;
	};

	View.delegateViewEvents = View.delegateViewsEvents =
	function(selector, views) {
		var self = this;

		if (!_.isArray(views)) {
			views = [views];
		}

		var listeners = this._viewsEventsHash[selector];
		if (listeners) {
			_(listeners).each(function(listener) {
				_(views).each(function(view) {
					self.listenTo(view,	listener.eventName,	listener.handler);
				});
			});
		}

		return self;
	};

	View.undelegateViewEvents = View.undelegateViewsEvents = function(views) {
		var self = this;

		if (!_.isArray(views)) {
			views = [views];
		}

		_(views).each(function(view) {
			self.stopListening(view);
		});
	};

	/*
	 * Wrap all non-array views groups to arrays with one element
	 */

	View._normalizeViews = function() {
		var self = this;

		_(this.views).each(function(views, selector) {
			if (!_.isArray(views)) {
				self.views[selector] = [views];
			}
		});
	};

	/*
	 * Get view attached state
	 */

	View.isAttached = function() {
		var view = this.$el.data('view');

		return this.$el && view && view === this;
	};

	/*
	 * Detach all previous views and attach new view to current view $el
	 */

	View.attach = function() {
		// return if current view is already attached
		if (this.isAttached()) return this;

		// detach all nested views
		this.$('.view-attached').each(function() {
			var view = $(this).data('view');

			if (view) view.detach();
		});

		// detach previous instance attached to this element
		var view = this.$el.data('view');

		// detach previous view
		if (view) {
			view.detach();
		}

		// attach current view
		this.$el.data('view', this).addClass('view-attached');

		return this;
	};

	/*
	 * Detach view from current view $el
	 */

	View.detach = function() {
		// return if current view is not already attached
		if (!this.isAttached()) return this;
		
		this.beforeDetachViews();

		this.$el.removeData('view').removeClass('view-attached');
		this.undelegateEvents();
		this.stopListening();

		return this;
	};

	View.remove = function() {
		// @TODO: maybe autoremove?
		if (this.parent) {
			throw new Error('View parent is already set. ' +
				'You should use parent removeView or removeViews before remove.');
		}

		this.detach();

		this.$el.remove();
	};

	/*
	 * Get view, that attached to closest element with class `.view-attached`
	 *
	 * @param {String | $} selector
	 */

	View.getClosestView = function(selector) {
		var $selector = $(selector);

		if (!$selector.is('.view-attached')) {
			$selector = $selector.closest('.view-attached');
		}

		return $selector.length ? $selector.data('view') : null;
	};

	View._prepareViewsEvents = function(viewsEvents) {
		var self = this;
		if (!(viewsEvents || (viewsEvents = _.result(this, 'viewsEvents')))) {
			return this;
		}

		// bind all prefixed events to view then call native delegate events
		_(viewsEvents).each(function(method, key) {
			if (!_.isFunction(method)) method = self[viewsEvents[key]];
			if (!method) return;

			var match = key.match(delegateEventSplitter);
			var eventName = match[1];
			var selectors = match[2].replace(/ *, */g, ',').split(',');
			method = _.bind(method, self);

			// fill _viewsEventsHash
			_(selectors).each(function(selector) {
				if (!self._viewsEventsHash[selector]) {
					self._viewsEventsHash[selector] = [];
				}

				self._viewsEventsHash[selector].push({
					eventName: eventName,
					handler: method
				});
			});
		});

		return this;
	};

	return backbone.View.extend(View);
}));
