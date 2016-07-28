'use strict';

require([
	'esencia/router', 'views/layout', 'views/todos/index'
], function(
	Router, LayoutView, TodosView
) {
	var router = new Router({
		autoloadModules: false
	});

	router.controller({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	router.controller({
		url: '',
		parentName: 'layout',
		container: '#content',
		View: TodosView
	});

	router.start();
});