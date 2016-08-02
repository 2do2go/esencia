(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'underscore',
            'backbone'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('backbone'));
    } else {
        this.Esencia = factory(_, Backbone);
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
            var _ = _require(5);
            var backbone = _require(4);
            var Collection = {};
            var baseMethods = [
                    'create',
                    'update',
                    'patch',
                    'delete',
                    'read'
                ];
            var execMethodType = 'PUT';
            Collection.sync = function (method, model, options) {
                if (!_.contains(baseMethods, method)) {
                    options = options || {};
                    var params = {
                            type: execMethodType,
                            dataType: 'json',
                            contentType: 'application/json',
                            processData: false
                        };
                    if (!options.url) {
                        var url = _.result(model, 'url') || urlError();
                        params.url = url + (url.charAt(url.length - 1) === '/' ? '' : '/') + method;
                    }
                    if (options.data && _.isObject(options.data)) {
                        options.data = JSON.stringify(options.data);
                    }
                    var xhr = options.xhr = backbone.ajax(_.extend(params, options));
                    model.trigger('request', model, xhr, options);
                    return xhr;
                } else {
                    return backbone.Collection.prototype.sync.call(this, method, model, options);
                }
            };
            Collection.exec = function (method, options) {
                options = options ? _.clone(options) : {};
                var collection = this;
                var success = options.success;
                options.success = function (resp) {
                    if (success)
                        success(collection, resp, options);
                    collection.trigger('exec:' + method, collection, resp, options);
                };
                var error = options.error;
                options.error = function (resp) {
                    if (error)
                        error(collection, resp, options);
                    collection.trigger('error', collection, resp, options);
                };
                return this.sync(method, this, options);
            };
            var urlError = function () {
                throw new Error('A "url" property or function must be specified');
            };
            module.exports = backbone.Collection.extend(Collection);
        },
        function (module, exports) {
            'use strict';
            var Router = _require(2);
            var Collection = _require(0);
            var View = _require(3);
            module.exports.Router = Router;
            module.exports.Collection = Collection;
            module.exports.View = View;
        },
        function (module, exports) {
            'use strict';
            var _ = _require(5);
            var backbone = _require(4);
            var View = _require(3);
            var Router = {
                    root: '/',
                    rootViewEl: 'html',
                    modulesPath: 'modules/',
                    defaultModuleName: 'main',
                    pushState: false,
                    namedParameters: false,
                    autoloadModules: true,
                    debug: false,
                    config: {},
                    onModuleError: function () {
                    },
                    nowhereUrl: '___'
                };
            var routerOptions = [
                    'root',
                    'rootViewEl',
                    'modulesPath',
                    'defaultModuleName',
                    'pushState',
                    'namedParameters',
                    'autoloadModules',
                    'debug',
                    'config',
                    'onModuleError',
                    'nowhereUrl'
                ];
            Router.constructor = function (options) {
                options = options || {};
                _.extend(this, _.pick(options, routerOptions));
                this.options = options;
                this.components = {};
                this.componentsTree = null;
                this.urlParams = {};
                this.modules = {};
                this.history = backbone.history;
                backbone.Router.namedParameters = this.namedParameters;
                backbone.Router.apply(this, arguments);
                if (options.autoloadModules) {
                    this.route('*url', function (params) {
                        this.setModule(params);
                    });
                }
            };
            Router._initRootComponent = function () {
                var RootView = View.extend({ el: this.rootViewEl });
                this.component({
                    name: '',
                    parent: null,
                    View: RootView
                });
            };
            Router._populateUrlParams = function (componentName, params) {
                var urlParams = this.urlParams;
                var key;
                for (key in urlParams) {
                    if (_(urlParams).has(key)) {
                        delete urlParams[key];
                    }
                }
                var component = this.components[componentName];
                return _(urlParams).extend(_(component).result('defaultUrlParams'), params);
            };
            var componentOptions = [
                    'url',
                    'name',
                    'parent',
                    'container',
                    'View',
                    'models',
                    'collections',
                    'viewOptions',
                    'defaultUrlParams'
                ];
            Router.component = function (options) {
                var router = this;
                options = _({}).defaults(options, {
                    parent: '',
                    defaultUrlParams: {},
                    viewOptions: {},
                    process: false
                });
                var component = _(options).pick(componentOptions);
                if (_.isUndefined(component.name)) {
                    component.name = _.uniqueId('auto-named-component');
                }
                if (!_.isString(component.name)) {
                    throw new Error('Component `name` option should be a string');
                }
                if (component.name in this.components) {
                    throw new Error('Duplicate component with name "' + component.name + '"');
                }
                if (!component.View) {
                    throw new Error('Component `View` option is required');
                }
                if (!_.isString(component.parent) && !_.isNull(component.parent)) {
                    throw new Error('Component `parent` option should be a string or null');
                }
                this.components[component.name] = component;
                if (!_.isUndefined(component.url)) {
                    this.route(component.url, component.name, function (params) {
                        router._populateUrlParams(component.name, params);
                        router._processComponent(component.name);
                    });
                }
                if (options.process) {
                    this._processComponent(component.name);
                }
                return this;
            };
            Router._calculateComponentsTree = function (componentName, child) {
                var component = this.components[componentName];
                if (!component) {
                    throw new Error('Unknown component with name "' + componentName + '"');
                }
                var node = { name: componentName };
                if (child) {
                    node.child = child;
                }
                if (_.isString(component.parent)) {
                    return this._calculateComponentsTree(component.parent, node);
                } else {
                    return node;
                }
            };
            Router._isComponentTreeNodeChanged = function (oldNode, node) {
                if (!oldNode || oldNode.name !== node.name || !oldNode.view)
                    return true;
                var component = this.components[node.name];
                if (oldNode.view instanceof component.View === false)
                    return true;
                if (!oldNode.view.isAttached())
                    return true;
                return !oldNode.view.isUnchanged();
            };
            Router._applyComponentsTree = function (params, callback) {
                var self = this;
                var parentNode = params.parentNode;
                var iterateNode = function (oldNode, node) {
                    var childNode = node.child;
                    delete node.child;
                    if (parentNode) {
                        parentNode.child = node;
                    } else {
                        self.componentsTree = node;
                    }
                    if (childNode) {
                        self._applyComponentsTree({
                            parentNode: node,
                            oldNode: oldNode && oldNode.child || null,
                            node: childNode
                        }, callback);
                    } else {
                        callback();
                    }
                };
                var node = params.node;
                var oldNode = params.oldNode;
                var component = this.components[node.name];
                var onViewResolve = function (view) {
                    node.view = view;
                    view.setData();
                    if (component.container) {
                        if (!parentNode) {
                            throw new Error('Parent component should exist for component with ' + '`container` option');
                        }
                        parentNode.view.setView(view, component.container);
                        parentNode.view.renderViews();
                    } else {
                        view.render();
                    }
                    iterateNode(null, node);
                };
                var view;
                if (this._isComponentTreeNodeChanged(oldNode, node)) {
                    view = new component.View(_(component).chain().pick('models', 'collections').defaults(_(component).result('viewOptions')).extend({ router: this }).value());
                    if (view.isWaiting()) {
                        view.once('resolve', function () {
                            onViewResolve(view);
                        });
                    } else {
                        onViewResolve(view);
                    }
                } else {
                    view = oldNode.view;
                    var oldChildNode = oldNode.child;
                    var oldChildNodeContainer;
                    if (oldChildNode && oldChildNode.view) {
                        oldChildNodeContainer = oldChildNode.view.container;
                        view.removeView(oldChildNode.view, oldChildNodeContainer);
                    }
                    node.view = view;
                    view.setData();
                    view.render();
                    if (oldChildNode && oldChildNode.view) {
                        view.setView(oldChildNode.view, oldChildNodeContainer);
                    }
                    iterateNode(oldNode, node);
                }
            };
            Router._processComponent = function (componentName, callback) {
                callback = callback || _.noop;
                var newComponentsTree = this._calculateComponentsTree(componentName);
                this._applyComponentsTree({
                    parentNode: null,
                    oldNode: this.componentsTree,
                    node: newComponentsTree
                }, callback);
            };
            Router.route = function (url, name, callback) {
                var router = this;
                if (_.isFunction(name)) {
                    callback = name;
                    name = '';
                }
                backbone.Router.prototype.route.call(this, url, name, function () {
                    var args = arguments;
                    router._defaultMiddleware({
                        url: url,
                        name: name,
                        callback: callback
                    }, function () {
                        callback.apply(router, args);
                    });
                });
            };
            Router.navigate = function (fragment, options) {
                options = options || {};
                if (fragment.indexOf(this.root) === 0) {
                    fragment = fragment.substring(this.root.length);
                }
                if (options.force) {
                    this.navigate(this.nowhereUrl, {
                        replace: options.replace,
                        trigger: false
                    });
                    options = _(options).chain().omit('force').extend({ replace: true }).value();
                    return this.navigate(fragment, options);
                }
                options = _(options || {}).defaults({
                    trigger: true,
                    params: {}
                });
                var qs = options.qs;
                if (qs) {
                    _(qs).each(function (val, key, qs) {
                        if (val === undefined || val === null)
                            delete qs[key];
                    });
                    fragment = this.toFragment(fragment, qs);
                    delete options.qs;
                }
                backbone.Router.prototype.navigate.call(this, fragment, options);
            };
            Router._defaultMiddleware = function (route, next) {
                next();
            };
            Router.middleware = function (middleware) {
                var router = this;
                var defaultMiddleware = this._defaultMiddleware;
                this._defaultMiddleware = function (route, next) {
                    defaultMiddleware.call(router, route, function () {
                        middleware.call(router, route, next);
                    });
                };
                return this;
            };
            Router.setModule = function (params) {
                var router = this;
                var url = params.url;
                delete params.url;
                var moduleName = _(url.split('/')).find(_.identity) || this.defaultModuleName;
                require([this.modulesPath + moduleName], function (moduleInit) {
                    if (!router.modules[moduleName]) {
                        moduleInit(router);
                        router.modules[moduleName] = true;
                        router.navigate(url, {
                            replace: true,
                            force: true,
                            qs: params
                        });
                    }
                }, this.onModuleError);
            };
            Router.start = function () {
                this._initRootComponent();
                backbone.history.start({
                    pushState: this.pushState,
                    root: this.root
                });
            };
            module.exports = backbone.Router.extend(Router);
        },
        function (module, exports) {
            'use strict';
            var _ = _require(5);
            var backbone = _require(4);
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
            View.wait = function () {
                var self = this;
                this._waiting = true;
                return function () {
                    self._waiting = false;
                    self.trigger('resolve');
                };
            };
            View.isWaiting = function () {
                return this._waiting;
            };
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
                this._waiting = false;
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
            View.render = function (options) {
                if (this.isWaiting())
                    return this;
                options = options || {};
                if (this.template && (options.force || !this.isAttached() || !this.isUnchanged())) {
                    this._createTemplateElement();
                    this._isAfterAttachNeeded = true;
                }
                this.attach();
                this.renderViews(options);
                if (this.$el.parent().length) {
                    this._afterAttachViews();
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
            View._createTemplateElement = function () {
                var templateData = this.getTemplateData();
                var html = this.renderTemplate(this.template, templateData);
                var $html = $(html);
                if ($html.length > 1) {
                }
                var $newEl = $html.first();
                if (this.$el.parent().length) {
                    this.$el.replaceWith($newEl);
                }
                this.setElement($newEl, true);
                return this;
            };
            View.renderViews = function (options) {
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
                    if (_(viewsGroup).some(function (view) {
                            return !view.isAttached() || !$container.is(view.$el.parent());
                        })) {
                        $container.append(_(viewsGroup).pluck('$el'));
                    }
                });
            };
            View.setView = View.setViews = function (views, container, index) {
                return this._updateViews('set', views, container, index);
            };
            View.replaceView = View.replaceViews = function (views, container, index) {
                return this.setViews.apply(this, arguments);
            };
            View.appendView = View.appendViews = function (views, container) {
                return this.insertViews(views, container);
            };
            View.prependView = View.prependViews = function (views, container) {
                return this.insertViews(views, container, 0);
            };
            View.insertView = View.insertViews = function (views, container, index) {
                return this._updateViews('insert', views, container, index);
            };
            View.removeView = View.removeViews = function (views, container, index) {
                if (arguments.length < 2) {
                    throw new Error('"views" or "index" arguments must be specified');
                }
                if (_.isString(views)) {
                    index = container;
                    container = views;
                    views = this.getView(container, index);
                    if (!views)
                        return this;
                }
                return this._updateViews('remove', views, container);
            };
            View.getView = function (container, index) {
                return this.getViews(container)[index || 0] || null;
            };
            View.getViews = function (container) {
                return _.clone(this.views[container]) || [];
            };
            View._updateViews = function (method, views, container, index) {
                var self = this;
                if (!views) {
                    throw new Error('"views" argument must be specified');
                }
                if (!_.isArray(views))
                    views = [views];
                var viewsGroup = this.getViews(container);
                switch (method) {
                case 'set':
                    if (viewsGroup.length) {
                        var removedViews = [];
                        if (typeof index !== 'undefined') {
                            removedViews = this.getView(container, index);
                            removedViews = removedViews ? [removedViews] : [];
                        } else {
                            removedViews = viewsGroup;
                        }
                        if (removedViews.length) {
                            this._updateViews('remove', removedViews, container);
                            _(removedViews).each(function (view) {
                                view.remove();
                            });
                        }
                    }
                    this._updateViews('insert', views, container, index);
                    break;
                case 'insert':
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
                    break;
                case 'remove':
                    if (!viewsGroup.length)
                        break;
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
                        break;
                    _(viewObjs).each(function (viewObj) {
                        var view = viewObj.view;
                        splice.call(self.views[container], viewObj.index, 1);
                        self.undelegateNestedEvents(view);
                        delete view.parent;
                    });
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
            View.isAttached = function () {
                var view = this.$el.data('esencia-view');
                return Boolean(view && view === this);
            };
            View._afterAttachViews = function () {
                _(this.views).each(function (viewsGroup) {
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view._afterAttachViews();
                    });
                });
                if (this._isAfterAttachNeeded) {
                    delete this._isAfterAttachNeeded;
                    this.afterAttach();
                }
            };
            View.afterAttach = function () {
                return this;
            };
            View.attach = function () {
                if (this.isAttached())
                    return this;
                var previousView = this.$el.data('esencia-view');
                if (previousView)
                    previousView.detach();
                this.$el.data('esencia-view', this).attr('esencia-view', this.cid);
                return this;
            };
            View._detachViews = function () {
                _(this.views).each(function (viewsGroup) {
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view.detach();
                    });
                });
            };
            View.beforeDetach = function () {
                return this;
            };
            View.detach = function () {
                if (!this.isAttached())
                    return this;
                this._detachViews();
                this.beforeDetach();
                this.$el.removeData('esencia-view').removeAttr('esencia-view');
                this.undelegateEvents();
                this.stopListening();
                return this;
            };
            View.remove = function () {
                if (this.parent) {
                    this.parent.removeView(this, this.container);
                }
                this.detach();
                this._removeElement();
                return this;
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
    return _require(1);
}));
//# sourceMappingURL=esencia.js.map
