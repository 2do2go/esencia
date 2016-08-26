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
	'esencia',
	'views/layout/index',
	'views/categories/layout',
	'views/categories/list',
	'views/users/layout',
	'views/users/list'
], function(
	esencia,
	LayoutView,
	CategoriesLayoutView,
	CategoriesListView,
	UsersLayoutView,
	UsersListView
) {
	esencia.componentsManager.add({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	esencia.componentsManager.add({
		name: 'categories/layout',
		parent: 'layout',
		container: '#content',
		View: CategoriesLayoutView
	});

	esencia.componentsManager.add({
		name: 'categories',
		parent: 'categories/layout',
		container: '#list',
		View: CategoriesListView
	});

	esencia.componentsManager.add({
		name: 'users/layout',
		parent: 'layout',
		container: '#content',
		View: UsersLayoutView
	});

	esencia.componentsManager.add({
		name: 'users',
		parent: 'users/layout',
		container: '#list',
		View: UsersListView
	});

	esencia.componentsManager.process('categories');

	esencia.on('processComponent', function(name) {
		esencia.componentsManager.process(name);
	});
});
