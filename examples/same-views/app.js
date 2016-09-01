'use strict';

require([
	'esencia', 'layout.view', 'content.view'
], function(Esencia, LayoutView, ContentView) {
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	router.route('first/:test/asd', {
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

	if (!Esencia.history.start({pushState: false})) {
		router.navigate('first/asdsad/asd?b=2', {replace: true, trigger: true});
	}
});
