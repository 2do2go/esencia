'use strict';

require.config({
	paths: {
		jquery: '../../node_modules/jquery/dist/jquery.min',
		backbone: '../../node_modules/backbone/backbone-min',
		underscore: '../../node_modules/underscore/underscore-min',
		esencia: '../../dist/esencia.min',
		utils: '../utils'
	}
});

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

	router.route('first', {
		component: {
			parent: 'layout',
			container: '#first',
			View: ContentView
		}
	});

	router.route('second', {
		component: {
			parent: 'layout',
			container: '#second',
			View: ContentView
		}
	});

	router.route('', function() {
		router.navigate('first', {replace: true});
	});

	esencia.history.start({pushState: false});
});
