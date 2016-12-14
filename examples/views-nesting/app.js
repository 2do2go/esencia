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
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	router.component({
		name: 'categories-layout',
		parent: 'layout',
		container: '#content',
		View: CategoriesLayoutView
	});

	router.route('categories', {
		component: {
			parent: 'categories-layout',
			container: '#list',
			View: CategoriesListView
		}
	});

	router.component({
		name: 'users-layout',
		parent: 'layout',
		container: '#content',
		View: UsersLayoutView
	});

	router.route('users', {
		component: {
			parent: 'users-layout',
			container: '#list',
			View: UsersListView
		}
	});

	if (!Esencia.history.start({pushState: false})) {
		Esencia.history.navigate('categories', {replace: true, trigger: true});
	}
});
