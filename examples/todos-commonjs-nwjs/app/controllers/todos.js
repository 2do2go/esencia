'use strict';

var ParentController = require('../../../../esencia').Controller,
	Collection = require('../../../../esencia').Collection,
	View = require('../views/todos/index');


var Controller = {
	url: '',
	parentName: 'layout',
	View: View
};

Controller.prepare = function() {
	this.collections = {todos: new Collection()};
};

module.exports = ParentController.extend(Controller);
