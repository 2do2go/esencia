'use strict';

define([
	'underscore', 'esencia', 'text!./layout.html'
], function(_, esencia, template) {
	var View = {template: _.template(template)};

	View.initialize = function() {
		setTimeout(this.wait(), 300);
	};

	return esencia.View.extend(View);
});
