 'use strict';

require([
	'esencia/view',
	'esencia/router',
	'views/layout',
	'views/categories/layout',
	'views/categories/list',
	'views/users/layout',
	'views/users/list'
], function(
	BaseView,
	Router,
	LayoutView,
	CategoriesLayoutView,
	CategoriesListView,
	UsersLayoutView,
	UsersListView
) {
	var router = new Router({
		autoloadModules: false
	});

	BaseView.prototype.router = router;

	router.controller({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});
	router.controller({
		name: 'categories/layout',
		parentName: 'layout',
		container: '#content',
		View: CategoriesLayoutView
	});
	router.controller({
		url: 'categories(/reset)',
		parentName: 'categories/layout',
		container: '#list',
		View: CategoriesListView
	});
	router.controller({
		name: 'users/layout',
		parentName: 'layout',
		container: '#content',
		View: UsersLayoutView
	});
	router.controller({
		url: 'users(/reset)',
		parentName: 'users/layout',
		container: '#list',
		View: UsersListView
	});

	router.route('', function() {
		router.navigate('categories', {replace: true});
	});

	router.start({pushState: false});
});