'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('categories-layout')};

	View.initialize = function() {
		setTimeout(this.wait(), 300);
	};

	return esencia.View.extend(View);
});
