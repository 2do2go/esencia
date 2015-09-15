'use strict';

define([
	'esencia/controller', 'views/users/layout'
], function(ParentController, View) {
	var Controller = {
		name: 'users/layout',
		parentName: 'layout',
		View: View
	};

	return ParentController.extend(Controller);
});
