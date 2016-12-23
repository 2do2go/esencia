'use strict';

define([
	'esencia', 'common/base.view', './menu.view'
], function(Esencia, BaseView, MenuView) {
	return BaseView.extend({
		template: 'layout',
		views: {
			'#menu': MenuView
		},
		viewEvents: {
			'click #menu': 'onMenuClick'
		},
		_update: function(state) {
			this.getView('#menu').update({
				data: {
					selected: state.data.fragment.match(/[^\?\/]+/)[0]
				}
			});
		},
		onMenuClick: function(event) {
			event.preventDefault();
			var href = this.$(event.currentTarget).attr('href');
			Esencia.history.navigate(href, true);
		}
	});
});
