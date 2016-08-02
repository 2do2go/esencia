'use strict';

define([
	'underscore', 'esencia'
], function(_, esencia) {
	var View = {
		template: _.template(document.getElementById('tmpl-layout').innerHTML)
	};

	return esencia.View.extend(View);
});
