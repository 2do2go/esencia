'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('users-list')};

	return esencia.View.extend(View);
});
