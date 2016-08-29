'use strict';

require(['esencia', './views'], function(Esencia, views) {
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: views.Layout
	});

	router.route('first', {
		component: {
			parent: 'layout',
			container: '#first',
			View: views.Content
		}
	});

	router.route('second', {
		component: {
			parent: 'layout',
			container: '#second',
			View: views.Content
		}
	});

	router.route('', function() {
		router.navigate('first', {replace: true});
	});

	Esencia.history.start({pushState: false});
});
