'use strict';

define([
	'esencia', 'baseView', './menu'
], function(Esencia, ExamplesBaseView, MenuView) {
	return ExamplesBaseView.extend({
		template: 'layout',
		events: {
			views: {
				'click #menu': 'onMenuClick'
			}
		},
		views: function() {
			return {'#menu': new MenuView()};
		},
		setData: function() {
			this.getView('#menu').setData({
				selected: Esencia.history.fragment.match(/[^\?\/]+/)[0]
			});
		},
		onMenuClick: function(item) {
			Esencia.history.navigate(item, true);
		}
	});
});
