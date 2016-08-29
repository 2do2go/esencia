'use strict';

define(['esencia', 'baseView'], function(Esencia, ExamplesBaseView) {
	return ExamplesBaseView.extend({
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
			Esencia.history.loadUrl();
		}
	});
});
