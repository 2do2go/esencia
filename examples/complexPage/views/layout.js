'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		el: '#app',
		template: _.template(document.getElementById('tmpl-layout').innerHTML),
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

	return ParentView.extend(View);
});
