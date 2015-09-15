'use strict';

require([
	'esencia/view',
	'esencia/router',
	'controllers/layout',
	'controllers/categories/layout',
	'controllers/categories/list',
	'controllers/users/layout',
	'controllers/users/list'
], function(
	BaseView,
	Router,
	LayoutController,
	CategoriesLayoutController,
	CategoriesListController,
	UsersLayoutController,
	UsersListController
) {
	var router = new Router({
		autoloadModules: false
	});

	BaseView.prototype.router = router;

	router.controller(new LayoutController());
	router.controller(new CategoriesLayoutController());
	router.controller(new CategoriesListController());
	router.controller(new UsersLayoutController());
	router.controller(new UsersListController());

	router.route('', function() {
		router.navigate('categories', {replace: true});
	});

	router.start({pushState: false});
});