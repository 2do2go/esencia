'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		el: '#list',
		template: _.template(document.getElementById('tmpl-users-list').innerHTML)
	};

	return ParentView.extend(View);
});
