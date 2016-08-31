'use strict';

define(['base.view'], function(BaseView) {
	return BaseView.extend({
		template: 'menu',
		triggers: {
			'click a': 'click',
		},
		isUnchanged: function() {
			var activeHref = this.$('.active').data('href');
			return this.data.selected === activeHref;
		}
	});
});
