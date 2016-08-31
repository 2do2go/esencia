'use strict';

define(['esencia', 'base.view'], function(Esencia, BaseView) {
	return BaseView.extend({
		template: 'layout',
		events: {
			'click a': 'onLinkClick'
		},
		onLinkClick: function(event) {
			event.preventDefault();
			Esencia.history.navigate(this.$(event.currentTarget).attr('href'), true);
		}
	});
});
