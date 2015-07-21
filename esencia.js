'use strict';

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['Collection', 'Controller', 'Router', 'View', 'Debugger'], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(
			require('./lib/collection'),
			require('./lib/controller'),
			require('./lib/router'),
			require('./lib/view'),
			require('./lib/debugger')
		);
    } else {
        // Browser globals (root is window)
        root.esencia = factory(
			root.esencia.Collection,
			root.esencia.Controller,
			root.esencia.Router,
			root.esencia.View,
			root.esencia.Debugger
		);
    }
}(this, function (Collection, Controller, Router, View, Debugger) {
    return {
		Collection: Collection,
		Controller: Controller,
		Router: Router,
		View: View,
		Debugger: Debugger
    };
}));

