'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		template: _.template(document.getElementById('tmpl-users-list').innerHTML)
	};

	return ParentView.extend(View);
});
