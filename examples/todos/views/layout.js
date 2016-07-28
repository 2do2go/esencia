'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		template: _.template(document.getElementById('tmpl-layout').innerHTML)
	};

	return ParentView.extend(View);
});
