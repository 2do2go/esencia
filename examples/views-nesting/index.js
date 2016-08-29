'use strict';

require(['esencia', './views/index'], function(Esencia, views) {
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: views.Layout
	});

	router.component({
		name: 'categories-layout',
		parent: 'layout',
		container: '#content',
		View: views.CategoriesLayout
	});

	router.route('categories', {
		component: {
			parent: 'categories-layout',
			container: '#list',
			View: views.CategoriesList
		}
	});

	router.component({
		name: 'users-layout',
		parent: 'layout',
		container: '#content',
		View: views.UsersLayout
	});

	router.route('users', {
		component: {
			parent: 'users-layout',
			container: '#list',
			View: views.UsersList
		}
	});

	router.route('', function() {
		router.navigate('categories', {replace: true, trigger: true});
	});

	Esencia.history.start({pushState: false});
});
