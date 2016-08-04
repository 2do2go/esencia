'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('categories-list')};

	View.initialize = function() {
		setTimeout(this.wait(), 300);
	};

	View.isUnchanged = function() {
		return false;
	};

	return esencia.View.extend(View);
});
