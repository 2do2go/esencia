'use strict';

require([
	'esencia', 'underscore', 'layout.view'
], function(Esencia, _, LayoutView) {
	// add logger
	Esencia.on('all', function(event) {
		window.console.log(
			'[log] ' +
			event + ': ' +
			_(arguments).chain().tail().map(JSON.stringify).join(', ').value()
		);
	});

	var router = new Esencia.Router({
		autoloadModules: true,
		modulesPath: './'
	});

	// add "layout" component
	router.component({
		name: 'layout',
		View: LayoutView,
		container: '#app'
	});

	// navigate to the default "first" route
	router.route('(/)', function() {
		router.navigate('first', {replace: true, trigger: true});
	});

	router.on('route', function(route, params) {
		Esencia.trigger('appRouter.route', route, params);
	});

	Esencia.history.start({pushState: false});
});
