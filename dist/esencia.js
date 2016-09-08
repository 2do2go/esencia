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
            var _ = _require(11);
            var backbone = _require(10);
            var execUtils = _require(8);
            var Collection = {};
            Collection.sync = function (method, collection, options) {
                options = execUtils.prepareOptions(method, collection, options);
                method = execUtils.getFakeBaseMethod(options);
                return backbone.Collection.prototype.sync.call(this, method, collection, options);
            };
            Collection.exec = function (method, options) {
                options = _.extend({ parse: true }, options);
                var collection = this;
                var success = options.success;
                options.success = function (resp) {
                    if (options.fetch)
                        collection[options.reset ? 'reset' : 'set'](resp, options);
                    if (success)
                        success.call(options.context, collection, resp, options);
                    collection.trigger('exec:' + method, collection, resp, options);
                };
                execUtils.wrapError(this, options);
                return this.sync(method, this, options);
            };
            module.exports = backbone.Collection.extend(Collection);
        },
        function (module, exports) {
            'use strict';
            var View = _require(5);
            var _ = _require(11);
            var CollectionView = {};
            var collectionEvents = {
                    add: '_onCollectionAdd',
                    change: '_onCollectionChange',
                    remove: '_onCollectionRemove'
                };
            CollectionView._prepareViews = function () {
                View.prototype._prepareViews.call(this);
                var self = this;
                this.views[this.itemsContainer] = this.collection.map(function (model) {
                    return new self.ItemView({ model: model });
                });
            };
            CollectionView._prepareEntityEvents = function () {
                View.prototype._prepareEntityEvents.call(this);
                this._addEntityEvents('collections', collectionEvents);
            };
            CollectionView._onCollectionAdd = function (model) {
                var index = _.indexOf(this.collection.models, model);
                this.addView(new this.ItemView({ model: model }), this.itemsContainer, { at: index });
                this.render({ include: this.itemsContainer });
            };
            CollectionView._onCollectionChange = function (model) {
                var index = _.indexOf(this.collection.models, model);
                var view = this.getView(this.itemsContainer, index);
                view.render();
            };
            CollectionView._onCollectionRemove = function (model, collection, options) {
                var view = this.getView(this.itemsContainer, options.index);
                view.remove();
            };
            module.exports = View.extend(CollectionView);
        },
        function (module, exports) {
            'use strict';
            var _ = _require(11);
            var backbone = _require(10);
            var View = _require(5);
            var extend = _require(9);
            function isTreeNodeChanged(oldNode, node) {
                return Boolean(!oldNode || oldNode.component.name !== node.component.name || !oldNode.view || oldNode.view instanceof node.component.View === false || oldNode.view.isWaiting() || !oldNode.view.attached || oldNode.view.loadState());
            }
            var ComponentsManager = function (options) {
                options = options || {};
                _.extend(this, _.pick(options, componentManagerOptions));
                this.options = options;
                this.components = {};
                this.tree = [];
                this.currentNames = [];
                if (this.autoAddRoot)
                    this._addRoot();
                this.initialize.apply(this, arguments);
            };
            var componentManagerOptions = [
                    'rootEl',
                    'autoAddRoot'
                ];
            var componentOptions = [
                    'name',
                    'parent',
                    'container',
                    'View',
                    'model',
                    'models',
                    'collection',
                    'collections',
                    'viewOptions'
                ];
            _.extend(ComponentsManager.prototype, backbone.Events, {
                rootEl: 'html',
                autoAddRoot: true,
                defaultParent: undefined,
                initialize: function () {
                },
                _addRoot: function () {
                    var RootView = View.extend({ el: this.rootEl });
                    this.add({
                        parent: null,
                        View: RootView
                    });
                },
                add: function (options) {
                    options = _.defaults({}, options, {
                        parent: this.defaultParent,
                        load: false
                    });
                    var component = _.pick(options, componentOptions);
                    var hasName = _.has(component, 'name');
                    var hasContainer = _.has(component, 'container');
                    var hasParent = _.isString(component.parent);
                    var isRoot = _.isNull(component.parent);
                    var hasDefaultParent = _.isString(this.defaultParent);
                    if (hasName && !_.isString(component.name)) {
                        throw new Error('Component `name` option should be a string');
                    }
                    if (hasName && _.has(this.components, component.name)) {
                        throw new Error('Duplicate component with name "' + component.name + '"');
                    }
                    if (!_.has(component, 'View')) {
                        throw new Error('Component `View` option is required');
                    }
                    if (!hasDefaultParent && _.isUndefined(component.parent)) {
                        throw new Error('Default root component is not set, add root component first');
                    }
                    if (!hasParent && !isRoot) {
                        throw new Error('Component `parent` option should be a string or null');
                    }
                    if (isRoot && hasContainer) {
                        throw new Error('Root component could not have a container');
                    }
                    if (hasParent && !hasContainer) {
                        throw new Error('Component `container` option is required for components with parent');
                    }
                    if (hasContainer && !_.isString(component.container)) {
                        throw new Error('Component `container` option should be a string selector');
                    }
                    if (!hasName) {
                        component.name = _.uniqueId('__COMPONENT_') + '__';
                    }
                    this.components[component.name] = component;
                    if (isRoot && (!hasDefaultParent || options.default)) {
                        this.defaultParent = component.name;
                    }
                    if (options.load) {
                        this.load(component.name);
                    }
                    return component;
                },
                get: function (name) {
                    var component = this.components[name];
                    if (!component) {
                        throw new Error('Component with name "' + name + '" does not exist');
                    }
                    return component;
                },
                remove: function (name) {
                    delete this.components[name];
                },
                load: function (names, options, callback) {
                    if (_.isFunction(names)) {
                        callback = names;
                        names = undefined;
                        options = undefined;
                    }
                    if (_.isFunction(options)) {
                        callback = options;
                        if (_.isArray(names) || _.isString(names)) {
                            options = undefined;
                        } else {
                            options = names;
                            names = undefined;
                        }
                    }
                    names = names || this.currentNames;
                    options = options || {};
                    callback = callback || _.noop;
                    if (!_.isArray(names))
                        names = [names];
                    if (!names.length) {
                        throw new Error('Component name or names to load should be set');
                    }
                    var treeNodes = this._buildTree(names);
                    var oldTreeNodes = this.tree;
                    this.tree = [];
                    this.currentNames = names;
                    this._applyTree({
                        parent: { children: this.tree },
                        oldNodes: oldTreeNodes,
                        nodes: treeNodes
                    }, options, callback);
                },
                _buildTree: function (names) {
                    var self = this;
                    var buildHashedTree = function (names, tree) {
                        if (!names.length)
                            return tree;
                        var parentNames = [];
                        var nodes = _(names).chain().uniq().map(function (name) {
                                var component = self.get(name);
                                if (_.has(tree, component.name))
                                    return null;
                                var node = {
                                        component: component,
                                        children: []
                                    };
                                if (_.isString(component.parent)) {
                                    parentNames.push(component.parent);
                                }
                                tree[component.name] = node;
                                return node;
                            }).compact().value();
                        tree = buildHashedTree(parentNames, tree);
                        _(nodes).each(function (node) {
                            if (_.isString(node.component.parent)) {
                                if (node.component.container && _(tree[node.component.parent].children).find(function (child) {
                                        return child.component.container === node.component.container;
                                    })) {
                                    throw new Error('Components could not have same container and parent in one tree');
                                }
                                tree[node.component.parent].children.push(node);
                            }
                        });
                        return tree;
                    };
                    var tree = buildHashedTree(names, {});
                    if (_.isEmpty(tree)) {
                        throw new Error('Components tree is empty');
                    }
                    tree = _(tree).filter(function (node) {
                        return _.isNull(node.component.parent);
                    });
                    if (!tree.length) {
                        throw new Error('Components tree should have at least one root node');
                    }
                    if (_(tree).some(function (node) {
                            return node.component.container;
                        })) {
                        throw new Error('Root component could not have a container');
                    }
                    return tree;
                },
                _applyTree: function (treeParams, options, callback) {
                    var self = this;
                    var parent = treeParams.parent;
                    var afterCallback = _.after(treeParams.nodes.length, callback);
                    var iterate = function (oldNode, node) {
                        var container = node.component.container;
                        var children = node.children;
                        var oldChildren = oldNode ? oldNode.children : [];
                        if (!node.view.attached && container) {
                            parent.view.setView(node.view, container).renderViews({ include: [container] }).attachViews({ include: [container] });
                        } else {
                            var exclude = _.union(_(children).chain().map(function (child) {
                                    return child.component.container;
                                }).compact().value(), _(oldChildren).chain().map(function (child) {
                                    return child.component.container;
                                }).compact().value());
                            node.view.render({ exclude: exclude });
                        }
                        node.children = [];
                        parent.children.push(node);
                        self._applyTree({
                            parent: node,
                            oldNodes: oldChildren,
                            nodes: children
                        }, options, afterCallback);
                    };
                    _(treeParams.nodes).each(function (node, index) {
                        var oldNode = treeParams.oldNodes[index] || null;
                        if (isTreeNodeChanged(oldNode, node)) {
                            if (oldNode && oldNode.view) {
                                if (oldNode.component.container) {
                                    if (oldNode.component.container !== node.component.container) {
                                        oldNode.view.remove();
                                    }
                                } else {
                                    oldNode.view.detach();
                                }
                            }
                            node.view = new node.component.View(_(node.component).chain().pick('model', 'models', 'collection', 'collections').extend(_.result(node.component, 'viewOptions'), { componentsManager: self }, options.viewOptions).value());
                            if (node.view.isWaiting()) {
                                self.listenToOnce(node.view, 'esencia:resolve', function () {
                                    iterate(null, node);
                                });
                            } else {
                                iterate(null, node);
                            }
                        } else {
                            node.view = oldNode.view;
                            node.view.modifyState(options.viewOptions);
                            iterate(oldNode, node);
                        }
                    });
                }
            });
            ComponentsManager.extend = extend;
            module.exports = ComponentsManager;
        },
        function (module, exports) {
            'use strict';
            var _ = _require(11);
            var backbone = _require(10);
            var execUtils = _require(8);
            var Model = {};
            Model.sync = function (method, model, options) {
                options = execUtils.prepareOptions(method, model, options);
                method = execUtils.getFakeBaseMethod(options);
                return backbone.Model.prototype.sync.call(this, method, model, options);
            };
            Model.exec = function (method, options) {
                options = _.extend({ parse: true }, options);
                var model = this;
                var success = options.success;
                options.success = function (resp) {
                    if (options.fetch) {
                        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
                        if (!model.set(serverAttrs, options))
                            return false;
                    }
                    if (success)
                        success.call(options.context, model, resp, options);
                    model.trigger('exec:' + method, model, resp, options);
                };
                execUtils.wrapError(this, options);
                return this.sync(method, this, options);
            };
            module.exports = backbone.Model.extend(Model);
        },
        function (module, exports) {
            'use strict';
            var _ = _require(11);
            var backbone = _require(10);
            var componentsManager = _require(7);
            var namesPattern = /[\:\*]([^\:\?\/]+)/g;
            var Router = {
                    componentsManager: componentsManager,
                    namedParameters: true,
                    autoloadModules: true,
                    modulesPath: 'modules/',
                    defaultModuleName: 'main',
                    onModuleError: function () {
                    }
                };
            var routerOptions = [
                    'componentsManager',
                    'namedParameters',
                    'autoloadModules',
                    'modulesPath',
                    'defaultModuleName',
                    'onModuleError'
                ];
            Router.constructor = function (options) {
                options = options || {};
                _.extend(this, _.pick(options, routerOptions));
                this.options = options;
                this.modules = {};
                backbone.Router.apply(this, arguments);
            };
            Router.component = function (options) {
                return this.componentsManager.add(options);
            };
            Router.route = function (route, options, callback) {
                var self = this;
                if (_.isFunction(options)) {
                    callback = options;
                    options = {};
                }
                if (!_.isObject(options)) {
                    options = { name: options };
                }
                var name = '';
                if (_.has(options, 'components') || _.has(options, 'component')) {
                    var components = _(options.components || [options.component]).map(function (componentOptions) {
                            if (_.isString(componentOptions)) {
                                return self.componentsManager.get(componentOptions);
                            } else {
                                return self.component(componentOptions);
                            }
                        });
                    var componentNames = _.pluck(components, 'name');
                    name = componentNames.join(',');
                    callback = function () {
                        var viewOptions = {
                                data: {
                                    fragment: backbone.history.fragment,
                                    params: self.namedParameters ? _.first(arguments) : _.initial(arguments),
                                    query: _.last(arguments)
                                }
                            };
                        self.componentsManager.load(componentNames, { viewOptions: viewOptions });
                    };
                }
                name = options.name || name;
                backbone.Router.prototype.route.call(this, route, name, callback);
            };
            Router._routeToRegExp = function (route) {
                var paramNames = route.match(namesPattern) || [];
                route = backbone.Router.prototype._routeToRegExp.call(this, route);
                route.paramNames = _(paramNames).map(function (name) {
                    return name.replace(/\)$/, '').substring(1);
                });
                return route;
            };
            Router._extractParameters = function (route, fragment) {
                var params = backbone.Router.prototype._extractParameters.call(this, route, fragment);
                if (!this.namedParameters || !route.paramNames)
                    return params;
                var namedParams = {};
                var paramsLength = params.length;
                _(route.paramNames).find(function (name, index) {
                    if (_.isString(params[index]) && index < paramsLength - 1) {
                        namedParams[name] = params[index];
                        return false;
                    } else {
                        return true;
                    }
                });
                var qs = params[paramsLength - 1];
                return [
                    namedParams,
                    qs
                ];
            };
            Router.loadModule = function (fragment) {
                var self = this;
                fragment = fragment || backbone.history.fragment;
                var moduleName = this.getModuleName(fragment);
                require([this.modulesPath + moduleName], function (moduleInit) {
                    if (!self.modules[moduleName]) {
                        moduleInit(self);
                        self.modules[moduleName] = true;
                        backbone.history.loadUrl(fragment);
                    }
                }, this.onModuleError);
            };
            Router.getModuleName = function (fragment) {
                return _(fragment.split('/')).find(_.identity) || this.defaultModuleName;
            };
            module.exports = backbone.Router.extend(Router);
        },
        function (module, exports) {
            'use strict';
            var _ = _require(11);
            var backbone = _require(10);
            var $ = backbone.$;
            var splice = Array.prototype.splice;
            var delegateEventSplitter = /^(\S+)\s*(.*)$/;
            var entityNamesSplitter = /\s*,\s*/g;
            function isContainerSkipped(container, options) {
                var exclude = options.exclude;
                var include = options.include;
                return Boolean(exclude && _.contains(_.isArray(exclude) ? exclude : [exclude], container) || include && !_.contains(_.isArray(include) ? include : [include], container));
            }
            var View = {
                    templateHelpers: {},
                    waitsCounter: 0,
                    waitAvailable: true,
                    attached: false
                };
            var entityTypes = [
                    'models',
                    'collections',
                    'views'
                ];
            var entityEventTypes = [
                    'modelEvents',
                    'collectionEvents',
                    'viewEvents'
                ];
            var additionalViewOptions = [
                    'componentsManager',
                    'template',
                    'templateHelpers',
                    'ui',
                    'triggers'
                ];
            var stateOptions = [
                    'data',
                    'models',
                    'collections',
                    'model',
                    'collection'
                ];
            var viewOptions = _.union(entityTypes, entityEventTypes, additionalViewOptions, stateOptions);
            View.constructor = function (options) {
                var self = this;
                options = options || {};
                _.extend(this, _.pick(options, viewOptions));
                this.options = options;
                this.data = _.result(this, 'data', {});
                this.templateData = {};
                this._prepareEntityEvents();
                this._prepareModels();
                this._prepareCollections();
                this._prepareViews();
                _(this.views).each(function (views, container) {
                    self.delegateEntityEvents('views', container, views);
                });
                backbone.View.call(this, _.omit(options, 'model', 'collection'));
                this.modifyViewsState(options);
                _(this.views).each(function (views) {
                    _(views).each(function (view) {
                        if (view.isWaiting()) {
                            self.listenToOnce(view, 'esencia:resolve', self.wait());
                        }
                    });
                });
                this.waitAvailable = false;
                _(this.collections).each(function (collection, name) {
                    self.delegateEntityEvents('collections', name, collection);
                });
                if (this.collection) {
                    this.delegateEntityEvents('collections', '', this.collection);
                }
                _(this.models).each(function (model, name) {
                    self.delegateEntityEvents('models', name, model);
                });
                if (this.model) {
                    this.delegateEntityEvents('models', '', this.model);
                }
            };
            View.modifyState = function (state, options) {
                state = state || {};
                options = options || {};
                var self = this;
                _(stateOptions).each(function (stateOption) {
                    if (!_.has(state, stateOption))
                        return;
                    var targetObj, stateObj, objKeys;
                    if (_.contains([
                            'data',
                            'models',
                            'collections'
                        ], stateOption)) {
                        stateObj = state[stateOption];
                        if (!_.isObject(stateObj)) {
                            throw new Error('State property `' + stateOption + '` should be an object');
                        }
                        targetObj = self[stateOption];
                        objKeys = _.keys(stateObj);
                    } else {
                        targetObj = self;
                        stateObj = state;
                        objKeys = [stateOption];
                    }
                    _(objKeys).each(function (objKey) {
                        if (_.has(targetObj, objKey) && _.contains([
                                'models',
                                'collections',
                                'model',
                                'collection'
                            ], stateOption)) {
                            self.undelegateEntityEvents(targetObj[objKey]);
                        }
                        targetObj[objKey] = stateObj[objKey];
                        if (_.contains([
                                'models',
                                'collections'
                            ], stateOption)) {
                            self.delegateEntityEvents(stateOption, objKey, stateObj[objKey]);
                        }
                        if (_.contains([
                                'model',
                                'collection'
                            ], stateOption)) {
                            self.delegateEntityEvents(stateOption + 's', '', stateObj[objKey]);
                        }
                    });
                });
                this.modifyViewsState(state, options);
                if (options.load) {
                    this.loadState();
                }
                return this;
            };
            View.loadState = function () {
                var stateChanged = false;
                if (this.template) {
                    var templateData = this.getTemplateData();
                    stateChanged = !this.isStatesEqual(this.templateData, templateData);
                    if (stateChanged)
                        this.templateData = templateData;
                }
                return stateChanged;
            };
            View.modifyViewsState = function () {
                return this;
            };
            View.isStatesEqual = function (oldState, newState) {
                return _.isEqual(oldState, newState);
            };
            View.wait = function () {
                if (!this.waitAvailable) {
                    throw new Error('Method .wait() is available only in the constructor');
                }
                var self = this;
                this.waitsCounter++;
                this.trigger('esencia:wait');
                return _.once(function () {
                    _.defer(function () {
                        self.waitsCounter--;
                        if (!self.isWaiting()) {
                            self.trigger('esencia:resolve');
                        }
                    });
                });
            };
            View.isWaiting = function () {
                return this.waitsCounter > 0;
            };
            View._render = function (options) {
                if (this.isWaiting())
                    return this;
                options = options || {};
                if (this.template) {
                    var stateChanged = this.loadState();
                    if (options.force || !this.attached || stateChanged) {
                        this.detach();
                        var locals = _(this).chain().result('templateHelpers').extend(this.templateData).value();
                        var html = this.renderTemplate(this.template, locals);
                        if (!_.isString(html)) {
                            throw new Error('`renderTemplate` method should return a HTML string');
                        }
                        var $el = $(html);
                        if (!$el.length) {
                            throw new Error('View template produces empty html');
                        }
                        if ($el.length > 1) {
                            throw new Error('View template produces html with more than one root elements');
                        }
                        this.setElement($el);
                    }
                } else {
                    if (!this.$el.length)
                        this._ensureElement();
                }
                this.trigger('esencia:render');
                this.renderViews(options);
                if (!this.parent || this.$container) {
                    this.attachViews(options);
                    this.attach();
                }
                return this;
            };
            View.render = function (options) {
                return this._render(options);
            };
            View.getTemplateData = function () {
                return {};
            };
            View.renderTemplate = function (template, locals) {
                if (!_.isFunction(template)) {
                    throw new Error('View `template` should be a function');
                }
                return template(locals);
            };
            View.renderViews = function (options) {
                var self = this;
                _(this.views).each(function (viewsGroup, container) {
                    if (isContainerSkipped(container, options))
                        return;
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view.render(_.omit(options, 'include', 'exclude'));
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
            View.setView = function (view, container, options) {
                return this._setViews([view], container, options);
            };
            View.setViews = function (views, container, options) {
                return this._setViews(views, container, options);
            };
            View.appendView = function (view, container, options) {
                options = _(options || {}).omit('at');
                return this._addViews([view], container, options);
            };
            View.appendViews = function (views, container, options) {
                options = _(options || {}).omit('at');
                return this._addViews(views, container, options);
            };
            View.prependView = function (view, container, options) {
                options = _.extend({}, options, { at: 0 });
                return this._addViews([view], container, options);
            };
            View.prependViews = function (views, container, options) {
                options = _.extend({}, options, { at: 0 });
                return this._addViews(views, container, options);
            };
            View.addView = function (view, container, options) {
                return this._addViews([view], container, options);
            };
            View.addViews = function (views, container, options) {
                return this._addViews(views, container, options);
            };
            View.removeView = function (view, container, at) {
                if (arguments.length < 2) {
                    throw new Error('"view" or "at" arguments must be specified');
                }
                if (_.isString(view)) {
                    at = container;
                    container = view;
                    view = this.getView(container, at);
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
            View.getView = function (container, at) {
                return this.getViews(container)[at || 0] || null;
            };
            View.getViews = function (container) {
                return _.clone(this.views[container]) || [];
            };
            View.getViewsCount = function (container) {
                return (this.views[container] || []).length;
            };
            View._addViews = function (views, container, options) {
                var self = this;
                var viewsGroup = this.getViews(container);
                options = _.defaults({}, options, { at: viewsGroup.length });
                _(views).each(function (view) {
                    if (view.parent) {
                        view.parent.removeView(view, view.container);
                    }
                });
                if (!this.views[container])
                    this.views[container] = [];
                splice.apply(this.views[container], [
                    options.at,
                    0
                ].concat(views));
                _(views).each(function (view) {
                    view.parent = self;
                    view.container = container;
                });
                this.delegateEntityEvents('views', container, views);
                return this;
            };
            View._setViews = function (views, container, options) {
                options = options || {};
                var oldViews;
                if (_.isNumber(options.at)) {
                    var oldView = this.getView(container, options.at);
                    oldViews = oldView ? [oldView] : [];
                } else {
                    oldViews = this.getViews(container);
                }
                if (oldViews.length === views.length && _(oldViews).all(function (oldView, index) {
                        return oldView === views[index];
                    }))
                    return this;
                if (oldViews.length) {
                    this._removeViews(oldViews, container);
                    _(oldViews).each(function (view) {
                        view.remove();
                    });
                }
                return this._addViews(views, container, options);
            };
            View._removeViews = function (views, container) {
                var self = this;
                var viewsGroup = this.getViews(container);
                if (!viewsGroup.length)
                    return this;
                var viewObjs = _(views).chain().uniq().map(function (view) {
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
                    self.undelegateEntityEvents(view);
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
                this.ensureUI();
                return this;
            };
            View.ensureUI = function (ui) {
                ui = ui || _.result(this, 'ui', {});
                var self = this;
                this.$ui = _(ui).mapObject(function (selector) {
                    return self.$(selector);
                });
                return this;
            };
            View.delegateTriggers = function (triggers) {
                triggers = triggers || _.result(this, 'triggers');
                if (!triggers)
                    return this;
                var self = this;
                this.undelegateTriggers();
                _(triggers).each(function (event, key) {
                    var match = key.match(delegateEventSplitter);
                    var eventName = match[1];
                    var selector = match[2];
                    self.delegateTrigger(eventName, selector, _.bind(self.trigger, self, event));
                });
                return this;
            };
            View.delegateTrigger = function (eventName, selector, listener) {
                this.$el.on(eventName + '.delegateTriggers' + this.cid, selector, listener);
                return this;
            };
            View.undelegateTriggers = function () {
                if (this.$el)
                    this.$el.off('.delegateTriggers' + this.cid);
                return this;
            };
            View.undelegateTrigger = function (eventName, selector, listener) {
                this.$el.off(eventName + '.delegateTriggers' + this.cid, selector, listener);
                return this;
            };
            View.delegateEntityEvents = function (entityType, entityName, entities) {
                if (!_.has(this._entityEvents, entityType)) {
                    throw new Error('Wrong entity type "' + entityType + '", available values: ' + entityTypes.join(', '));
                }
                var self = this;
                if (!entities)
                    entities = this[entityType][entityName];
                if (!entities)
                    return this;
                if (!_.isArray(entities))
                    entities = [entities];
                var events = this._entityEvents[entityType][entityName];
                if (events) {
                    this.undelegateEntityEvents(entities);
                    _(events).each(function (event) {
                        _(entities).each(function (entity) {
                            self.listenTo(entity, event.name, event.listener);
                        });
                    });
                }
                return this;
            };
            View.undelegateEntityEvents = function (entities) {
                var self = this;
                if (!_.isArray(entities))
                    entities = [entities];
                _(entities).each(function (entity) {
                    self.stopListening(entity);
                });
                return this;
            };
            View._prepareEntityEvents = function () {
                var self = this;
                this._entityEvents = {};
                _(entityTypes).each(function (entityType) {
                    self._entityEvents[entityType] = {};
                });
                _(entityEventTypes).each(function (eventType, index) {
                    var events = _.result(self, eventType);
                    if (!events)
                        return;
                    var entityType = entityTypes[index];
                    self._addEntityEvents(entityType, events);
                });
            };
            View._addEntityEvents = function (entityType, events) {
                var self = this;
                _(events).each(function (method, key) {
                    if (!_.isFunction(method))
                        method = self[method];
                    if (!method)
                        return;
                    var match = key.match(delegateEventSplitter);
                    var eventName = match[1];
                    var entityNames = match[2].replace(entityNamesSplitter, ',').split(',');
                    method = _.bind(method, self);
                    _(entityNames).each(function (entityName) {
                        self._addEntityEvent(entityType, entityName, eventName, method);
                    });
                });
            };
            View._addEntityEvent = function (entityType, entityName, eventName, listener) {
                var entityEvents = this._entityEvents[entityType];
                entityEvents[entityName] = entityEvents[entityName] || [];
                entityEvents[entityName].push({
                    name: eventName,
                    listener: listener
                });
            };
            View._prepareViews = function () {
                this.views = _.result(this, 'views', {});
                this.views = _(this.views).mapObject(function (views) {
                    if (!views)
                        return [];
                    views = _.isArray(views) ? views : [views];
                    return _(views).map(function (view) {
                        return _.isFunction(view) ? new view() : view;
                    });
                });
            };
            View._prepareModels = function () {
                this.models = _.result(this, 'models', {});
                this.models = _(this.models).mapObject(function (model) {
                    return _.isFunction(model) ? new model() : model;
                });
                if (this.model && _.isFunction(this.model)) {
                    this.model = new this.model();
                }
            };
            View._prepareCollections = function () {
                this.collections = _.result(this, 'collections', {});
                this.collections = _(this.collections).mapObject(function (collection) {
                    return _.isFunction(collection) ? new collection() : collection;
                });
                if (this.collection && _.isFunction(this.collection)) {
                    this.collection = new this.collection();
                }
            };
            View.attachViews = function (options) {
                options = options || {};
                _(this.views).each(function (viewsGroup, container) {
                    if (isContainerSkipped(container, options))
                        return;
                    if (!viewsGroup.length)
                        return;
                    _(viewsGroup).each(function (view) {
                        view.attachViews(_.omit(options, 'include', 'exclude'));
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
                this.delegateTriggers();
                this.attached = true;
                this.afterAttach();
                this.trigger('esencia:attach');
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
                this.trigger('esencia:detach');
                this.beforeDetach();
                this.$el.removeData('esencia-view').removeAttr('esencia-view');
                this.undelegateEvents();
                this.undelegateTriggers();
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
            'use strict';
            var backbone = _require(10);
            var _ = _require(11);
            var Router = _require(4);
            var Collection = _require(0);
            var Model = _require(3);
            var View = _require(5);
            var CollectionView = _require(1);
            var ComponentsManager = _require(2);
            var componentsManager = _require(7);
            var extend = _require(9);
            var Esencia = exports;
            _.extend(Esencia, backbone.Events);
            var backboneFields = [
                    'Events',
                    'History',
                    'history'
                ];
            _.extend(Esencia, _.pick(backbone, backboneFields));
            _.extend(Esencia, {
                Router: Router,
                Collection: Collection,
                Model: Model,
                View: View,
                CollectionView: CollectionView,
                ComponentsManager: ComponentsManager
            });
            Esencia.componentsManager = componentsManager;
            Esencia.extend = extend;
        },
        function (module, exports) {
            'use strict';
            var ComponentsManager = _require(2);
            module.exports = new ComponentsManager();
        },
        function (module, exports) {
            'use strict';
            var _ = _require(11);
            var DEFAULT_EXEC_TYPE = 'PUT';
            var urlError = function () {
                throw new Error('A `url` property or function must be specified');
            };
            exports.wrapError = function (model, options) {
                var error = options.error;
                options.error = function (resp) {
                    if (error)
                        error.call(options.context, model, resp, options);
                    model.trigger('error', model, resp, options);
                };
            };
            exports.prepareOptions = function (method, model, options) {
                options = _.extend({
                    type: DEFAULT_EXEC_TYPE,
                    dataType: 'json',
                    contentType: 'application/json',
                    processData: false
                }, options);
                if (!options.url) {
                    var url = _.result(model, 'url') || urlError();
                    options.url = url.replace(/[^\/]$/, '$&/') + method;
                }
                if (options.data && _.isObject(options.data) && !options.processData) {
                    options.data = JSON.stringify(options.data);
                }
                return options;
            };
            var baseMethodsMap = {
                    'POST': 'create',
                    'PUT': 'update',
                    'PATCH': 'patch',
                    'DELETE': 'delete',
                    'GET': 'read'
                };
            exports.getFakeBaseMethod = function (options) {
                return baseMethodsMap[options.type.toUpperCase()];
            };
        },
        function (module, exports) {
            'use strict';
            var backbone = _require(10);
            module.exports = backbone.View.extend;
        },
        function (module, exports) {
            module.exports = __external_Backbone;
        },
        function (module, exports) {
            module.exports = __external__;
        }
    ];
    return _require(6);
}));
//# sourceMappingURL=esencia.js.map
