'use strict';

global.document = window.document;
global.navigator = window.navigator;

var Backbone = require('backbone'),
	$ = require('jquery');

Backbone.$ = $;

var Router = require('../../../esencia').Router,
	LayoutController = require('./controllers/layout'),
	TodosController = require('./controllers/todos');

var router = new Router({
	autoloadModules: false
});

router.controller(new LayoutController());
router.controller(new TodosController());

router.start();
