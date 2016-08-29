'use strict';

require(['esencia', 'baseView'], function(Esencia, ExamplesBaseView) {
	var views = {};

	views.Layout = ExamplesBaseView.extend({
		template: 'layout',
		events: {
			'click a': 'onLinkClick'
		},
		onLinkClick: function(event) {
			event.preventDefault();
			Esencia.history.navigate(this.$(event.currentTarget).attr('href'), true);
		}
	});

	views.Content = ExamplesBaseView.extend({
		template: 'content'
	});

	return views;
});
