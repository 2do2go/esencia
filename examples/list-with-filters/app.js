'use strict';

require(['esencia', 'layout.view'], function(Esencia, LayoutView) {
	var router = new Esencia.Router();

	router.route('(/)', {
		component: {
			container: '#app',
			View: LayoutView
		}
	});

	if (!Esencia.history.start({pushState: false})) {
		Esencia.history.navigate('/', {replace: true, trigger: true});
	}
});
