'use strict';

define([
	'underscore', 'esencia', 'text!./layout.html'
], function(_, esencia, template) {
	var View = {template: _.template(template)};

	return esencia.View.extend(View);
});
