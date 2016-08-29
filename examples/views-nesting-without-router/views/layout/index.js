'use strict';

define([
	'esencia', 'underscore', 'baseView', './menu'
], function(Esencia, _, ExamplesBaseView, MenuView) {
	return ExamplesBaseView.extend({
		template: 'layout',
		events: {
			views: {
				'click #menu': 'onMenuClick'
			}
		},
		views: function() {
			return {'#menu': new MenuView({data: {selected: 'categories'}})};
		},
		onMenuClick: function(item) {
			this.getView('#menu').setData({selected: item});
			Esencia.componentsManager.process(item);
		}
	});
});
