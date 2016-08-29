'use strict';

require(['esencia', './views/index'], function(Esencia, views) {
	Esencia.componentsManager.add({
		name: 'layout',
		container: '#app',
		View: views.Layout
	});

	Esencia.componentsManager.add({
		name: 'categories/layout',
		parent: 'layout',
		container: '#content',
		View: views.CategoriesLayout
	});

	Esencia.componentsManager.add({
		name: 'categories',
		parent: 'categories/layout',
		container: '#list',
		View: views.CategoriesList
	});

	Esencia.componentsManager.add({
		name: 'users/layout',
		parent: 'layout',
		container: '#content',
		View: views.UsersLayout
	});

	Esencia.componentsManager.add({
		name: 'users',
		parent: 'users/layout',
		container: '#list',
		View: views.UsersList
	});

	Esencia.componentsManager.process('categories');
});
