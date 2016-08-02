'use strict';

define([
	'underscore', 'esencia', 'text!./menu.html'
], function(_, esencia, template) {
	var View = {template: _.template(template)};

	View.isUnchanged = function() {
		var activeHref = this.$('.active').attr('href');
		return this.data.selected === activeHref;
	};

	return esencia.View.extend(View);
});
