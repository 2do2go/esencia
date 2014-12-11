'use strict';

require([
	'esencia/router', 'controllers/layout', 'controllers/todos'
], function(
	Router, LayoutController, TodosController
) {
	var router = new Router({
		autoloadModules: false
	});

	router.controller(new LayoutController());
	router.controller(new TodosController());

	router.start();
});