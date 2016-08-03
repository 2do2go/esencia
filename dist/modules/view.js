(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'underscore',
            'backbone'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('backbone'));
    } else {
        this.Esencia.View = factory(_, Backbone);
    }
}(function (__external__, __external_Backbone) {
    var global = this, define;
    function _require(id) {
        var module = _require.cache[id];
        if (!module) {
            var exports = {};
            module = _require.cache[id] = {
                id: id,
                exports: exports
            };
            _require.modules[id].call(exports, module, exports);
        }
        return module.exports;
    }
    _require.cache = [];
    _require.modules = [
        function (module, exports) {
            'use strict';
            var _ = _require(2);
            var backbone = _require(1);
            var $ = backbone.$;
            var splice = Array.prototype.splice;
            var delegateEventSplitter = /^(\S+)\s*(.*)$/;
            var nestedEventTypes = [
                    'views',
                    'collections',
                    'models'
                ];
            var View = { templateHelpers: {} };
            var viewOptions = [
                    'models',
                    'collections',
                    'views',
                    'events',
                    'data',
                    'router',
                    'templateHelpers'
                ];
            View.constructor = function (options) {
                var self = this;
                options = options || {};
                this.views = {};
                this.data = this.data || {};
                _.extend(this, _.pick(options, viewOptions));
                this.options = options;
                if (this.template && !_.isFunction(this.template)) {
                    throw new Error('View `template` option should be a function');
                }
                this._normalizeViews();
                this._prepareNestedEvents();
                this.waiting = false;
                this.attached = false;
                backbone.View.apply(this, arguments);
                if (this.collections) {
                    _(this.collections).each(function (collection, key) {
                        self.delegateNestedEvents('collections', key, collection);
                    });
                }
                if (this.models) {
                    _(this.models).each(function (model, key) {
                        self.delegateNestedEvents('models', key, model);
                    });
                }
            };
            View.setData = function (data) {
                if (data)
                    this.data = data;
            };
            View.isUnchanged = function () {
                return true;
            };
            View.wait = function () {
                var self = this;
                this.waiting = true;
                return function () {
                    self.waiting = false;
                    self.trigger('resolve');
                };
            };
            View.render = function (options) {
                console.log('>>>      render: %o %o', this, this.$el);
                if (this.waiting)
                    return this;
                options = options || {};
                if (this.template) {
                    if (options.force || !this.attached || !this.isUnchanged()) {
                        this.detach();
                        var html = this.renderTemplate(this.template, this.getTemplateData());
                        var $el = $(html);
                        if (!$el.length) {
                            throw new Error('View template produce empty html');
                        }
                        if ($el.length > 1) {
                            throw new Error('View template produce html with more than one root elements');
                        }
                        this.setElement($el);
                    }
                } else {
                    if (!this.$el.length)
                        this._ensureElement();
                }
                this.renderViews(options);
                if (!this.parent || this.$container) {
                    this.attachViews();
                    this.attach();
                }
                return this;
            };
            View.getTemplateData = function () {
                return this.data;
            };
            View.renderTemplate = function (template, data) {
                data = _(this).chain().result('templateHelpers').extend(data).value();
                return template(data);
            };
            View.renderViews = function (options) {
                console.log('>>> renderViews: %o %o', this, this.$el);
                var self = this;
                _(this.views).each(function (viewsGroup, container) {
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view.render(options);
                    });
                    var $container = container ? self.$(container).first() : self.$el;
                    if (!$container.length) {
                        throw new Error('Container "' + container + '" is not found');
                    }
                    var containerEl = $container.get(0);
                    var domChanged = _(viewsGroup).some(function (view) {
                            return !view.attached || !view.$container || view.$container.get(0) !== containerEl;
                        });
                    if (domChanged) {
                        var $els = [];
                        _(viewsGroup).each(function (view) {
                            view.$container = $container;
                            $els.push(view.$el);
                        });
                        $container.append($els);
                    }
                });
                return this;
            };
            View.setView = function (view, container, index) {
                return this._updateViews([view], container, index);
            };
            View.setViews = function (views, container, index) {
                return this._updateViews(views, container, index);
            };
            View.replaceView = function (view, container, index) {
                return this._updateViews([view], container, index);
            };
            View.replaceViews = function (views, container, index) {
                return this._updateViews(views, container, index);
            };
            View.appendView = function (view, container) {
                return this._insertViews([view], container);
            };
            View.appendViews = function (views, container) {
                return this._insertViews(views, container);
            };
            View.prependView = function (view, container) {
                return this._insertViews([view], container, 0);
            };
            View.prependViews = function (views, container) {
                return this._insertViews(views, container, 0);
            };
            View.insertView = function (view, container, index) {
                return this._insertViews([view], container, index);
            };
            View.insertViews = function (views, container, index) {
                return this._insertViews(views, container, index);
            };
            View.removeView = function (view, container, index) {
                if (arguments.length < 2) {
                    throw new Error('"view" or "index" arguments must be specified');
                }
                if (_.isString(view)) {
                    index = container;
                    container = view;
                    view = this.getView(container, index);
                    if (!view)
                        return this;
                }
                return this._removeViews([view], container);
            };
            View.removeViews = function (views, container) {
                if (_.isString(views)) {
                    container = views;
                    views = this.getViews(container);
                }
                return this._removeViews(views, container);
            };
            View.getView = function (container, index) {
                return this.getViews(container)[index || 0] || null;
            };
            View.getViews = function (container) {
                return _.clone(this.views[container]) || [];
            };
            View._insertViews = function (views, container, index) {
                console.log('>>> _insertViews:', views, container, index);
                var self = this;
                var viewsGroup = this.getViews(container);
                _(views).each(function (view) {
                    if (view.parent) {
                        view.parent.removeView(view, view.container);
                    }
                });
                if (viewsGroup.length) {
                    if (typeof index === 'undefined') {
                        index = viewsGroup.length;
                    }
                    splice.apply(this.views[container], [
                        index,
                        0
                    ].concat(views));
                } else {
                    this.views[container] = views;
                }
                _(views).each(function (view) {
                    view.parent = self;
                    view.container = container;
                });
                this.delegateNestedEvents('views', container, views);
                return this;
            };
            View._updateViews = function (views, container, index) {
                console.log('>>> _updateViews:', views, container, index);
                var viewsGroup = this.getViews(container);
                if (viewsGroup.length) {
                    var removedViews = [];
                    if (typeof index !== 'undefined') {
                        removedViews = this.getView(container, index);
                        removedViews = removedViews ? [removedViews] : [];
                    } else {
                        removedViews = viewsGroup;
                    }
                    if (removedViews.length) {
                        this._removeViews(removedViews, container);
                        _(removedViews).each(function (view) {
                            view.remove();
                        });
                    }
                }
                return this._insertViews(views, container, index);
            };
            View._removeViews = function (views, container) {
                console.log('>>> _removeViews:', views, container);
                var self = this;
                var viewsGroup = this.getViews(container);
                if (!viewsGroup.length)
                    return this;
                var viewObjs = _.chain(views).uniq().map(function (view) {
                        return {
                            view: view,
                            index: _.indexOf(viewsGroup, view)
                        };
                    }).filter(function (viewObj) {
                        return viewObj.index >= 0;
                    }).sortBy(function (viewObj) {
                        return -viewObj.index;
                    }).value();
                if (!viewObjs.length)
                    return this;
                _(viewObjs).each(function (viewObj) {
                    var view = viewObj.view;
                    splice.call(self.views[container], viewObj.index, 1);
                    self.undelegateNestedEvents(view);
                    delete view.parent;
                });
                return this;
            };
            View.setElement = function (element) {
                var $previousEl = this.$el;
                this._setElement(element);
                if ($previousEl && this.$container) {
                    $previousEl.replaceWith(this.$el);
                }
                return this;
            };
            View.delegateEvents = function (events) {
                events = events || _.result(this, 'events');
                if (!events)
                    return this;
                events = _(events).omit(nestedEventTypes);
                return backbone.View.prototype.delegateEvents.call(this, events);
            };
            View.delegateNestedEvents = function (type, key, entities) {
                var self = this;
                if (!_.isArray(entities))
                    entities = [entities];
                var listeners = this._nestedEventsHash[type][key];
                if (listeners) {
                    _(listeners).each(function (listener) {
                        _(entities).each(function (entity) {
                            self.listenTo(entity, listener.eventName, listener.handler);
                        });
                    });
                }
                return this;
            };
            View.undelegateNestedEvents = function (entities) {
                var self = this;
                if (!_.isArray(entities))
                    entities = [entities];
                _(entities).each(function (entity) {
                    self.stopListening(entity);
                });
                return this;
            };
            View._prepareNestedEvents = function (events) {
                var self = this;
                this._nestedEventsHash = {};
                _(nestedEventTypes).each(function (type) {
                    self._nestedEventsHash[type] = {};
                });
                events = events || _.result(this, 'events');
                if (!events)
                    return;
                _(nestedEventTypes).each(function (type) {
                    var typeEventsHash = self._nestedEventsHash[type];
                    if (!_(events).has(type) || !_.isObject(events[type]))
                        return;
                    _(events[type]).each(function (method, key) {
                        if (!_.isFunction(method))
                            method = self[method];
                        if (!method)
                            return;
                        var match = key.match(delegateEventSplitter);
                        var eventName = match[1];
                        var entityKeys = match[2].replace(/ *, */g, ',').split(',');
                        method = _.bind(method, self);
                        _(entityKeys).each(function (entityKey) {
                            typeEventsHash[entityKey] = typeEventsHash[entityKey] || [];
                            typeEventsHash[entityKey].push({
                                eventName: eventName,
                                handler: method
                            });
                        });
                    });
                });
            };
            View._normalizeViews = function () {
                var self = this;
                _(this.views).each(function (views, container) {
                    if (!_.isArray(views)) {
                        self.views[container] = [views];
                    }
                });
            };
            View.attachViews = function () {
                _(this.views).each(function (viewsGroup) {
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view.attachViews();
                        view.attach();
                    });
                });
                return this;
            };
            View.afterAttach = function () {
                return this;
            };
            View.attach = function () {
                if (this.attached)
                    return this;
                var previousView = this.$el.data('esencia-view');
                if (previousView)
                    previousView.detach();
                this.$el.data('esencia-view', this).attr('esencia-view', this.cid);
                this.delegateEvents();
                this.attached = true;
                console.log('>>>      attach: %o %o', this, this.$el);
                this.afterAttach();
                return this;
            };
            View.detachViews = function () {
                _(this.views).each(function (viewsGroup) {
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view.detachViews();
                        view.detach();
                    });
                });
                return this;
            };
            View.beforeDetach = function () {
                return this;
            };
            View.detach = function () {
                if (!this.attached)
                    return this;
                console.log('>>>      detach: %o %o', this, this.$el);
                this.beforeDetach();
                this.$el.removeData('esencia-view').removeAttr('esencia-view');
                this.undelegateEvents();
                this.attached = false;
                return this;
            };
            View.remove = function () {
                if (this.parent) {
                    this.parent.removeView(this, this.container);
                }
                this.detachViews();
                this.detach();
                return backbone.View.prototype.remove.call(this);
            };
            View.getClosestView = function (selector) {
                var $selector = $(selector);
                if (!$selector.is('[esencia-view]')) {
                    $selector = $selector.closest('[esencia-view]');
                }
                return $selector.length ? $selector.data('esencia-view') : null;
            };
            module.exports = backbone.View.extend(View);
        },
        function (module, exports) {
            module.exports = __external_Backbone;
        },
        function (module, exports) {
            module.exports = __external__;
        }
    ];
    return _require(0);
}));
//# sourceMappingURL=view.js.map
