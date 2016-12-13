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
		modifyViewsState: function() {
			this.getView('#menu').modifyState({
				data: {
					selected: this.componentsManager.currentNames[0]
				}
			});
		},
		onMenuClick: function(event) {
			event.preventDefault();
			var href = this.$(event.currentTarget).data('href');
			Esencia.componentsManager.load(href);
		}
	});
});
