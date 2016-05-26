'use strict';

(function (root, factory) {
	function makeGlobal(Debugger) {
		root.esencia = root.esencia || {};
		root.esencia.Debugger = Debugger;
	}

	if (typeof exports === 'object') {
		// CommonJS
		module.exports = factory(
			require('underscore'),
			require('./backbone'),
			require('./router'),
			require('./controller'),
			require('./view')
		);
		makeGlobal(module.exports);
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define([
			'underscore', 'backbone',
			'esencia/router', 'esencia/controller', 'esencia/view'
		], function(_, Backbone, Router, Controller, View) {
			// Use global variables if the locals are undefined.
			var Debugger = factory(
				_ || root._, Backbone || root.Backbone, Router, Controller, View
			);
			makeGlobal(Debugger);
			return Debugger;

		});
	} else {
		// RequireJS isn't being used.
		// Assume underscore and backbone are loaded in <script> tags
		root.esencia = root.esencia || {};
		makeGlobal(factory(root._, root.Backbone,
			root.esencia.Router, root.esencia.Controller, root.esencia.View));
	}
}(this, function(_, backbone, Router, Controller, View) {
	var debug;

	if (typeof window !== 'undefined') {
		debug = window.console || {};
	} else {
		debug = console || {};
	}

	var noop = function() {};
	_(['group', 'groupEnd', 'groupCollapsed', 'log']).each(function(method) {
		debug[method] = typeof debug[method] === 'function' ? debug[method] : noop;
	});

	var trim = String.prototype.trim || function() {
		return this.replace(/^\s+|\s+$/g, '');
	};

	function getTime() {
		function addLeadZeros(num, length) {
			return ('0000' + num).substr(-length, length);
		}

		var now = new Date(),
			ms = now.getMilliseconds(),
			s = now.getSeconds(),
			m = now.getMinutes(),
			h = now.getHours();

		return addLeadZeros(h, 2) + ':' + addLeadZeros(m, 2) + ':' +
			addLeadZeros(s, 2) + '.' + addLeadZeros(ms, 3);
	}

	var Debugger = function() {
		this.groupLevel = 0;

		this.preffixes = {
			router: '[Debugger:Router]',
			controller: '[Debugger:Controller]',
			view: '[Debugger:View]'
		};

		this._wrapRouter();
		this._wrapController();
		this._wrapView();
	};

	// wrap router methods
	Debugger.prototype._wrapRouter = function() {
		var self = this;

		_(['route', 'controller', 'middleware']).each(function(method) {
			self._wrapMethod(Router.prototype, 'router', method, false);
		});

		_(['navigate', 'processController']).each(function(method) {
			self._wrapMethod(Router.prototype, 'router', method, true);
		});
	};

	// wrap controller methods
	Debugger.prototype._wrapController = function() {
		var self = this;

		// wrap controller _configure method instead of constructor,
		// because no access to constructor
		_(['_configure']).each(function(method) {
			self._wrapMethod(Controller.prototype, 'controller', method, false);
		});

		_(['process']).each(function(method) {
			self._wrapMethod(Controller.prototype, 'controller', method, true);
		});
	};

	// wrap view methods
	Debugger.prototype._wrapView = function() {
		var self = this;

		// wrap backbone view constructor instead of base view
		// because no access to base view constructor
		backbone.View = backbone.View.extend(self._wrapMethod({
			constructor: backbone.View
		}, 'view', 'constructor', false));

		_(['render', 'afterRenderViews', '_updateViews', 'afterRender', 'remove',
			'attach', 'detach'])
			.each(function(method) {
				self._wrapMethod(View.prototype, 'view', method, false);
			});

		self._wrapMethod(View.prototype, 'view', 'setHtml', true);
	};

	Debugger.prototype.openGroup = function(params) {
		params = params || {};

		var title = params.title || '';

		var preffix = params.preffix || '';
		if (preffix && !this.groupLevel) {
			preffix = getTime() + ' ' + preffix + ' ';
		}

		var collapsed = true;
		if (!_.isUndefined(params.collapsed)) collapsed = params.collapsed;

		debug[collapsed ? 'groupCollapsed' : 'group'](
			'%c' + preffix + '%c' + title,
			'color: #777;', 'color: #333;'
		);

		this.groupLevel++;
	};

	Debugger.prototype.closeGroup = function() {
		if (this.groupLevel > 0) {
			debug.groupEnd();
			this.groupLevel--;
		}
	};

	Debugger.prototype.closeAllGroups = function() {
		while (this.groupLevel) {
			this.closeGroup();
		}
	};

	Debugger.prototype.print = function() {
		debug.log.apply(debug, arguments);
	};

	Debugger.prototype.printArguments = function(fn, args) {
		if (!args.length) return;

		var self = this;

		this.print('%carguments:', 'color: darkGreen;');

		var fnMatch = /^function *\((.*)\)/g.exec(fn.toString());
		var argsNames = fnMatch && fnMatch[1] ? fnMatch[1].split(',') : [];

		_(args).each(function(arg, i) {
			self.print(
				'%c' + (trim.apply(argsNames[i]) || 'arg' + i) + ':',
				'padding-left: 30px;',
				_.isString(arg) ? '"' + arg + '"' : arg
			);
		});
	};

	Debugger.prototype._wrapMethod = function(
		obj, type, method, callOutside, extraFn
	) {
		var self = this;
		var oldMethod = obj[method];

		extraFn = extraFn || function() {};

		obj[method] = function() {
			self.openGroup({title: method, preffix: self.preffixes[type]});
			self.printArguments(oldMethod, arguments);
			self.print('%c' + type + ':', 'color: darkGreen;', this);

			if (callOutside) {
				self.closeGroup();
			}

			var methodResult;

			try {
				methodResult = oldMethod.apply(this, arguments);
				extraFn.apply(this, arguments);
			} catch(err) {
				self.closeAllGroups();
				throw err;
			}

			if (!callOutside) {
				self.closeGroup();
			}

			return methodResult;
		};

		return obj;
	};

	return Debugger;
}));
