'use strict';

require([
	'esencia', 'views/layout', 'views/todos/index'
], function(
	esencia, LayoutView, TodosView
) {
	var router = new esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	router.component({
		url: '',
		parent: 'layout',
		container: '#content',
		View: TodosView
	});

	router.start();
});
