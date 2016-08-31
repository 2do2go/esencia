'use strict';

define([
	'esencia',
	'layout/index.view',
	'categories/layout.view',
	'categories/list.view',
	'users/layout.view',
	'users/list.view'
], function(
	Esencia,
	LayoutView,
	CategoriesLayoutView,
	CategoriesListView,
	UsersLayoutView,
	UsersListView
) {
	Esencia.componentsManager.add({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	Esencia.componentsManager.add({
		name: 'categories/layout',
		parent: 'layout',
		container: '#content',
		View: CategoriesLayoutView
	});

	Esencia.componentsManager.add({
		name: 'categories',
		parent: 'categories/layout',
		container: '#list',
		View: CategoriesListView
	});

	Esencia.componentsManager.add({
		name: 'users/layout',
		parent: 'layout',
		container: '#content',
		View: UsersLayoutView
	});

	Esencia.componentsManager.add({
		name: 'users',
		parent: 'users/layout',
		container: '#list',
		View: UsersListView
	});

	Esencia.componentsManager.load('categories');
});
