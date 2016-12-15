'use strict';

define([
	'esencia', 'common/base.view'
], function(Esencia, BaseView) {
	Esencia.trigger('moduleLoaded', 'second');

	// create new router with "second" route
	var router = new Esencia.Router();

	var SecondView = BaseView.extend({
		template: 'second'
	});

	router.route('second', {
		component: {
			parent: 'layout',
			View: SecondView,
			container: '#content'
		}
	});

	router.on('route', function(route, params) {
		Esencia.trigger('secondRouter.route', route, params);
	});
});
