'use strict';

(function (root, factory) {
	function makeGlobal(Controller) {
		root.esencia = root.esencia || {};
		root.esencia.Controller = Controller;
		return Controller;
	}

	if (typeof exports === 'object' && root.require) {
		// CommonJS
		module.exports = factory(require('underscore'), require('backbone'));
		makeGlobal(module.exports);
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define(['underscore', 'backbone'], function(_, Backbone) {
			// Use global variables if the locals are undefined.
			var Controller = factory(_ || root._, Backbone || root.Backbone);
			return makeGlobal(Controller);
		});
	} else {
		// RequireJS isn't being used.
		// Assume underscore and backbone are loaded in <script> tags
		makeGlobal(factory(root._, root.Backbone));
	}
}(this, function(_, backbone) {
	/*
	 * Add base Controller class to backbone
	 */

	var Controller = backbone.Controller = function(options) {
		this._configure(options || {});
	};

	var stages = ['prepare', 'view', 'render', 'renderOnly'];

	var controllerOptions = [
		'url', 'name', 'parentName', 'models', 'collections',
		'viewOptions', 'defaultUrlParams'
	];

	// extend prototype from backbone Events
	_.extend(Controller.prototype, backbone.Events);

	/*
	 * Configure controller with options
	 */

	Controller.prototype._configure = function(options) {
		if (this.options) options = _.extend({}, _.result(this, 'options'), options);
		_.extend(this, _.pick(options, controllerOptions));
		this.options = options;
		this.defaultUrlParams = this.defaultUrlParams || {};
		this.viewOptions = this.viewOptions || {};
	};

	/*
	 * prepare is empty by default.
	 * It calling on process call if process method is called with
	 *  stage value `prepare` or higher.
	 * Override it if some data fetching logic needed.
	 * By default this method use sync logic.
	 * This method use async logic if it is defined with
	 *  callback function as first param.
	 *
	 * @param {Function} [callback]
	 */

	Controller.prototype.prepare = function() {};

	/*
	 * getView is empty by default.
	 * It calling on process call if process method is called with
	 *  stage value `view` or higher.
	 * Override it if some view creating logic needed.
	 * By default this method use sync logic.
	 * This method use async logic if it is defined with
	 *  callback function as first param.
	 *
	 * @param {Function} [callback]
	 */

	Controller.prototype.getView = function() {
		if (!this.View) {
			throw new Error(
				'`getView` method must be overriden or `View` must be set ' +
				'if you use `view` stage'
			);
		}

		return new (this.View)(
			_(this).chain().pick('models', 'collections', 'urlParams')
				.defaults(this.viewOptions).value()
		);
	};

	/*
	 * Render calling on process call if process method is called with
	 *  stage value `render` or higher.
	 * Override it if some specific rendering logic needed.
	 * By default this method use sync logic.
	 * This method use async logic if it is defined with
	 *  callback function as first param.
	 *
	 * @param {Function} [callback]
	 */

	Controller.prototype.render = function() {
		if (!this.view) {
			throw new Error(
				'`render` method must be overriden or `getView` method must return ' +
				'new `View` instance'
			);
		}

		this.view.render();
	};

	/*
	 * Main controller method for executing controller flow.
	 * It has four stages: `prepare`, `view`, `render`, `renderOnly`.
	 * You can pass specific stage name if not all stages need to call.
	 * Default stage is `render` and it include all available stages.
	 *
	 * @param {String} [stage]
	 * @param {Function} callback
	 */

	Controller.prototype.process = function(stage, callback) {
		if (_.isFunction(stage)) {
			callback = stage;
			stage = null;
		}

		stage = stage || 'render';
		callback = callback || function() {};

		if (!_(stages).contains(stage)) {
			throw new Error(
				'Unknown `Controller.process` param: `' + stage + '`. ' +
				'Available values: ' + stages.join(', ') + '.'
			);
		}

		var steps = this._makeStageSteps(stage);

		this._runStageSteps(steps, callback);
	};

	/*
	 * Return async step function that execute sync/async function
	 *  and execute `callback` after it with returned data from `fn`.
	 *
	 * @param {Function} fn - sync/async function (determined by fb.length)
	 * @param {Function} callback
	 */

	Controller.prototype._makeStageStep = function(fn, callback) {
		var controller = this;

		callback = callback || function() {};

		return function(next) {
			var nextWrap = function() {
				callback.apply(controller, arguments);
				next.call(controller);
			};

			if (fn.length) {
				fn.call(controller, nextWrap);
			} else {
				nextWrap(fn.call(controller));
			}
		};
	};

	/*
	 * Create steps chain based on stage.
	 *
	 * @param {String} stage
	 */

	Controller.prototype._makeStageSteps = function(stage) {
		var steps = [];

		// if we need to only rerender view
		if (stage === 'renderOnly') {
			steps.push(this._makeStageStep(this.render));

			return steps;
		}

		steps.push(this._makeStageStep(this.prepare));

		if (stage === 'prepare') return steps;

		steps.push(this._makeStageStep(this.getView, function(view) {
			this.view = view;
		}));

		if (stage === 'view') return steps;

		steps.push(this._makeStageStep(this.render));

		return steps;
	};

	/*
	 * Recursive method that consequentially execute steps chain and
	 *  call callback after all.
	 *
	 * @param {Function[]} steps
	 * @params {Function} callback
	 */

	Controller.prototype._runStageSteps = function(steps, callback) {
		if (steps.length) {
			var step = steps.shift();

			step.call(this, function() {
				this._runStageSteps(steps, callback);
			});
		} else {
			callback();
		}
	};

	/*
	 * There no good exports of extend method from backbone.
	 * Take it from Backbone.Model prototype and add to Controller
	 *  because no other ways, ughh :-S.
	 */

	var extend = backbone.Model.extend;

	Controller.extend = extend;

	return Controller;
}));
