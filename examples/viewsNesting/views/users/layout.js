'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('users-layout')};

	return esencia.View.extend(View);
});
