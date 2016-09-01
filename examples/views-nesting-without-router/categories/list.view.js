'use strict';

define(['esencia', 'common/base.view'], function(Esencia, BaseView) {
	return BaseView.extend({
		template: 'categories-list',
		events: {
			'click #reset': 'onResetClick'
		},
		initialize: function() {
			setTimeout(this.wait(), 300);
		},
		isUnchanged: function() {
			return false;
		},
		onResetClick: function(event) {
			event.preventDefault();
			Esencia.componentsManager.load();
		}
	});
});
