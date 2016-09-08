'use strict';

define(['common/base.view'], function(BaseView) {
	return BaseView.extend({
		template: 'menu',
		data: {
			selected: 'categories'
		},
		triggers: {
			'click a': 'click'
		},
		getTemplateData: function() {
			return {selected: this.data.selected};
		}
	});
});
