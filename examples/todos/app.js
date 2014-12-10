'use strict';

require([
	'esencia/router', 'controllers/layout', 'controllers/todos', 'esencia/debugger'
], function(
	Router, LayoutController, TodosController, Debugger
) {
	new Debugger

	var router = new Router({
		autoloadModules: false
	});

	router.controller(new LayoutController());
	router.controller(new TodosController());

	router.start();
});