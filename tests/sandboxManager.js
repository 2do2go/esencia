'use strict';

define(['underscore', 'jquery'], function(_, $) {
	var SandboxManager = function(options) {
		this.options = _({}).defaults(options, {
			container: 'body',
			idPrefix: ''
		});
		this.$container = $(this.options.container);
		this.$sandboxes = $();
		this.lastIndex = 0;
	};

	SandboxManager.prototype.create = function() {
		var id = 'sandbox-' + (++this.lastIndex);
		if (this.options.idPrefix) {
			id = this.options.idPrefix + '-' + id;
		}
		var $sandbox = $('<div>')
			.css({position: 'absolute', top: '-99999px'})
			.attr('id', id)
			.appendTo(this.$container);
		this.$sandboxes = this.$sandboxes.add($sandbox);
		return $sandbox;
	};

	SandboxManager.prototype.get = function(selector) {
		return this.$sandboxes.filter(selector);
	};

	SandboxManager.prototype.getSelector = function($sandbox) {
		$sandbox = $sandbox || this.create();
		return '#' + $sandbox.attr('id');
	};

	SandboxManager.prototype.remove = function($sandbox) {
		if (_.isString($sandbox)) {
			$sandbox = this.get($sandbox);
		}
		this.$sandboxes = this.$sandboxes.not($sandbox);
		$sandbox.remove();
	};

	SandboxManager.prototype.removeAll = function() {
		this.$sandboxes.remove();
		this.$sandboxes = $();
	};

	return SandboxManager;
});
