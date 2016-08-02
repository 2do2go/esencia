(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'underscore',
            'backbone'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('backbone'));
    } else {
        this.Esencia.Collection = factory(_, Backbone);
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
            module.exports = __external_Backbone;
        },
        function (module, exports) {
            module.exports = __external__;
        }
    ];
    return _require(0);
}));
//# sourceMappingURL=collection.js.map
