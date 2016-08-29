'use strict';

define(['baseView'], function(ExamplesBaseView) {
	return ExamplesBaseView.extend({
		template: 'menu',
		events: {
			'click a': 'onLinkClick',
		},
		isUnchanged: function() {
			var activeHref = this.$('.active').data('href');
			return this.data.selected === activeHref;
		},
		onLinkClick: function(event) {
			event.preventDefault();
			this.trigger('click', this.$(event.currentTarget).data('href'));
		}
	});
});
