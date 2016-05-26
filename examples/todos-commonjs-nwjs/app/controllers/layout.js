'use strict';

var ParentController = require('../../../../esencia').Controller,
	View = require('../views/layout');

var Controller = {
	name: 'layout',
	View: View
};

module.exports = ParentController.extend(Controller);

