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
	var router = new esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	router.component({
		name: 'categories/layout',
		parent: 'layout',
		container: '#content',
		View: CategoriesLayoutView
	});

	router.component({
		url: 'categories',
		parent: 'categories/layout',
		container: '#list',
		View: CategoriesListView
	});

	router.component({
		name: 'users/layout',
		parent: 'layout',
		container: '#content',
		View: UsersLayoutView
	});

	router.component({
		url: 'users',
		parent: 'users/layout',
		container: '#list',
		View: UsersListView
	});

	router.route('', function() {
		router.navigate('categories', {replace: true});
	});

	router.start({pushState: false});
});
