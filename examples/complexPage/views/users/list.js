'use strict';

define([
	'underscore', 'esencia', 'text!./list.html'
], function(_, esencia, template) {
	var View = {template: _.template(template)};

	return esencia.View.extend(View);
});
