'use strict';

define([
	'esencia', 'common/base.view'
], function(Esencia, BaseView) {
	Esencia.trigger('moduleLoaded', 'first');

	// create new router with "first" route
	var router = new Esencia.Router();

	var FirstView = BaseView.extend({
		template: 'first'
	});

	router.route('first', {
		component: {
			parent: 'layout',
			View: FirstView,
			container: '#content'
		}
	});

	router.on('route', function(route, params) {
		Esencia.trigger('firstRouter.route', route, params);
	});
});
