'use strict';

define([
	'esencia', 'base.view', './menu.view'
], function(Esencia, BaseView, MenuView) {
	return BaseView.extend({
		template: 'layout',
		views: function() {
			return {
				'#menu': new MenuView({data: {selected: 'categories'}})
			};
		},
		viewEvents: {
			'click #menu': 'onMenuClick'
		},
		onMenuClick: function(event) {
			event.preventDefault();
			var item = this.$(event.currentTarget).data('href');
			this.getView('#menu').setData({selected: item});
			Esencia.componentsManager.load(item);
		}
	});
});
