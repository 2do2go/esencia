'use strict';

define([
	'esencia/controller', 'views/users/list'
], function(ParentController, View) {
	var Controller = {
		url: 'users(/reset)',
		parentName: 'users/layout',
		View: View
	};

	return ParentController.extend(Controller);
});
