'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {
		template: template('layout'),
		events: {
			'click a': 'onLinkClick'
		}
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
