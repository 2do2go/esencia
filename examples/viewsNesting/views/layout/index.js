'use strict';

define([
	'esencia', 'utils/template', './menu'
], function(esencia, template, MenuView) {
	var View = {
		template: template('layout'),
		events: {
			'click a': 'onLinkClick'
		}
	};

	View.initialize = function() {
		this.setView(new MenuView(), '#menu');
	};

	View.setData = function() {
		this.getView('#menu').setData({
			selected: esencia.history.fragment.match(/[^\?\/]+/)[0]
		});
	};

	View.onLinkClick = function(event) {
		event.preventDefault();
		var $link = this.$(event.currentTarget);
		var force = $link.data('force');
		var replace = $link.data('replace');
		this.router.navigate($link.attr('href'), {force: force, replace: replace});
	};

	return esencia.View.extend(View);
});
