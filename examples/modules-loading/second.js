'use strict';

require([
	'esencia', 'second.view'
], function(Esencia, SecondView) {
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.route('second', {
		component: {
			parent: 'layout',
			View: SecondView,
			container: '#content'
		}
	});
});
