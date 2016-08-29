'use strict';

define([
	'./layout/index',
	'./categories/layout',
	'./categories/list',
	'./users/layout',
	'./users/list'
], function(
	LayoutView,
	CategoriesLayoutView,
	CategoriesListView,
	UsersLayoutView,
	UsersListView
) {
	return {
		Layout: LayoutView,
		CategoriesLayout: CategoriesLayoutView,
		CategoriesList: CategoriesListView,
		UsersLayout: UsersLayoutView,
		UsersList: UsersListView
	};
});
