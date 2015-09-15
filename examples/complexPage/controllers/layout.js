'use strict';

define([
	'esencia/controller', 'views/layout'
], function(ParentController, View) {
	var Controller = {
		name: 'layout',
		View: View
	};

	return ParentController.extend(Controller);
});
