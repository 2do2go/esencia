'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('menu')};

	View.isUnchanged = function() {
		var activeHref = this.$('.active').attr('href');
		return this.data.selected === activeHref;
	};

	return esencia.View.extend(View);
});
