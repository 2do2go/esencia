'use strict';

define(['base.view'], function(BaseView) {
	return BaseView.extend({
		template: 'categories-layout',
		initialize: function() {
			setTimeout(this.wait(), 300);
		}
	});
});
