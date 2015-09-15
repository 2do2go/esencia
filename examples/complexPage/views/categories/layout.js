'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		el: '#content',
		template: _.template(document.getElementById('tmpl-categories-layout').innerHTML)
	};

	return ParentView.extend(View);
});
