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
	'backbone',
	'esencia',
	'views/layout/index',
	'views/categories/layout',
	'views/categories/list',
	'views/users/layout',
	'views/users/list'
], function(
	backbone,
	esencia,
	LayoutView,
	CategoriesLayoutView,
	CategoriesListView,
	UsersLayoutView,
	UsersListView
) {
	var componentsManager = new esencia.ComponentsManager();

	componentsManager.addRootComponent();

	componentsManager.add({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	componentsManager.add({
		name: 'categories/layout',
		parent: 'layout',
		container: '#content',
		View: CategoriesLayoutView
	});

	componentsManager.add({
		name: 'categories',
		parent: 'categories/layout',
		container: '#list',
		View: CategoriesListView
	});

	componentsManager.add({
		name: 'users/layout',
		parent: 'layout',
		container: '#content',
		View: UsersLayoutView
	});

	componentsManager.add({
		name: 'users',
		parent: 'users/layout',
		container: '#list',
		View: UsersListView
	});

	componentsManager.process('categories');

	backbone.on('processComponent', function(name) {
		componentsManager.process(name);
	});
});
