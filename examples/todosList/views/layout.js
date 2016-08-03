'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('layout')};

	return esencia.View.extend(View);
});
