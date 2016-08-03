 'use strict';

require([
	'esencia',
	'views/layout',
	'views/content'
], function(
	esencia,
	LayoutView,
	ContentView
) {
	var router = new esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	router.component({
		url: 'first',
		parent: 'layout',
		container: '#first',
		View: ContentView
	});

	router.component({
		url: 'second',
		parent: 'layout',
		container: '#second',
		View: ContentView
	});

	router.route('', function() {
		router.navigate('first', {replace: true});
	});

	router.start({pushState: false});
});
