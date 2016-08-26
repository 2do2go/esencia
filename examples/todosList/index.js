'use strict';

require.config({
	paths: {
		jquery: '../../node_modules/jquery/dist/jquery.min',
		backbone: '../../node_modules/backbone/backbone-min',
		underscore: '../../node_modules/underscore/underscore-min',
		esencia: '../../dist/esencia.min',
		utils: '../utils'
	}
});

require([
	'esencia', 'views/index'
], function(
	esencia, TodosView
) {
	esencia.componentsManager.add({
		parent: null,
		View: TodosView,
		process: true
	});
});
