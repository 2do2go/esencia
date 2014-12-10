'use strict';

define([
	'esencia/controller', 'esencia/collection', 'views/todos/index'
], function(ParentController, Collection, View) {
	var Controller = {
		url: '',
		parentName: 'layout',
		View: View
	};

	Controller.prepare = function() {
		this.collections = {todos: new Collection()};
	};

	return ParentController.extend(Controller);
});
