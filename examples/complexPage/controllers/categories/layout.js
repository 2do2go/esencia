'use strict';

define([
	'esencia/controller', 'views/categories/layout'
], function(ParentController, View) {
	var Controller = {
		name: 'categories/layout',
		parentName: 'layout',
		View: View
	};

	return ParentController.extend(Controller);
});
