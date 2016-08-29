'use strict';

define(['baseView'], function(ExamplesBaseView) {
	return ExamplesBaseView.extend({
		template: 'categories-layout',
		initialize: function() {
			setTimeout(this.wait(), 300);
		}
	});
});
