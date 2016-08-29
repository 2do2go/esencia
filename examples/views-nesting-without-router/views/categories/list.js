'use strict';

define(['baseView'], function(ExamplesBaseView) {
	return ExamplesBaseView.extend({
		template: 'categories-list',
		initialize: function() {
			setTimeout(this.wait(), 300);
		},
		isUnchanged: function() {
			return false;
		}
	});
});
