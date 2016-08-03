'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {template: template('content')};

	return esencia.View.extend(View);
});
