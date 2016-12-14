'use strict';

require([
	'esencia', 'first.view'
], function(Esencia, FirstView) {
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.route('first', {
		component: {
			parent: 'layout',
			View: FirstView,
			container: '#content'
		}
	});
});
