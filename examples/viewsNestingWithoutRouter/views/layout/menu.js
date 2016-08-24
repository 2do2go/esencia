'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {
		template: template('menu'),
		events: {
			'click [data-link]': 'onLinkClick',
		}
	};

	View.isUnchanged = function() {
		var activeHref = this.$('.active').data('link');
		return this.data.selected === activeHref;
	};

	View.onLinkClick = function(event) {
		event.preventDefault();
		var $link = this.$(event.currentTarget);
		this.trigger('change', $link.data('link'));
	};

	return esencia.View.extend(View);
});
